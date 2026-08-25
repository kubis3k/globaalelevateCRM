-- =========================================================================
-- LEADY (PR2a) — konfigurovatelné skórování prospektů.
--   * crm_scoring_config  — váhy, prahy priorit (per-source) a kadence / tenant
--   * fn_prospect_score() — čistá výpočetní funkce (absolutní body + priorita)
--   * trigger na crm_prospects      — plní score / priority při zápisu
--   * trigger na crm_scoring_config — přepočte celý tenant po změně vah
--   * trigger na tenants            — nasype defaultní config novému tenantovi
-- Idempotentní.
-- DOWN: down/20240650000000_scoring_config.sql
--
-- POZOR — ZMĚNA SÉMANTIKY `crm_prospects.score`:
-- Dosud `score` plnila aplikace v api/prospects/import/route.ts (rozsah 0–15).
-- Od této migrace ho plní VÝHRADNĚ trigger níže a rozsah je 0–100. Ten mrtvý
-- výpočet v import route se odstraní v PR2b; cron/route.ts (digest řadí podle
-- score) a UI zobrazující score tím jen dostanou větší čísla, nic se nerozbije.
--
-- POZOR — "OSM problém" se řeší DVĚMA věcmi, tohle je jen první polovina:
--   1) prahy priorit jsou PER-SOURCE (viz thresholds níže). OSM lead nemá rating
--      ani review_count, jeho dosažitelné maximum je 65 bodů, takže prahy 45/30
--      jsou proporčně totéž co 70/50 ze 100.
--   2) fronta hovorů řadí PRIMÁRNĚ podle `web_status`, ne podle `score`
--      (implementuje PR5) — to je záměr, ne opomenutí.
-- Vědomě NEnormalizujeme skóre na dosažitelné maximum: normalizace by odměnila
-- neznalost (lead, o kterém víme jen telefon a e-mail, by vyšel na 100/A).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.crm_scoring_config (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  weights JSONB NOT NULL,
  thresholds JSONB NOT NULL,
  cadence INT[] NOT NULL DEFAULT '{0,2,5,9,14}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.crm_scoring_config (tenant_id, weights, thresholds)
SELECT t.id,
  '{"web_status":{"nema":40,"jen_social":30,"zastaraly":25,"ok":5},"review_count":[{"min":50,"pts":20},{"min":20,"pts":15},{"min":5,"pts":10}],"rating":[{"min":4.5,"pts":15},{"min":4.0,"pts":10}],"phone":15,"email":10}'::jsonb,
  '{"default":{"A":70,"B":50},"osm":{"A":45,"B":30},"web_firmy":{"A":55,"B":40}}'::jsonb
FROM public.tenants t
ON CONFLICT (tenant_id) DO NOTHING;

-- ── Defenzivní čtení čísla z jsonb ──────────────────────────────────────
-- Bez tohohle by JEDINÁ nečíselná hodnota ve `weights`/`thresholds` (např.
-- {"phone":"x"}) vyhodila cast chybu uvnitř BEFORE triggeru a zablokovala
-- VEŠKERÝ zápis do crm_prospects. Garbage config proto degraduje na default.
CREATE OR REPLACE FUNCTION public.fn_jsonb_num(p_val JSONB, p_fallback NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_val IS NULL THEN RETURN p_fallback; END IF;
  IF jsonb_typeof(p_val) = 'number' THEN RETURN p_val::TEXT::NUMERIC; END IF;
  IF jsonb_typeof(p_val) = 'string'
     AND p_val #>> '{}' ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    RETURN (p_val #>> '{}')::NUMERIC;
  END IF;
  RETURN p_fallback;
END $$;

-- ── Výpočet skóre ───────────────────────────────────────────────────────
-- score = ABSOLUTNÍ součet bodů za signály (defaultní váhy dávají 0–100).
-- priority = A/B/C podle prahů pro daný `source` (fallback na "default").
-- Signatura se proti první verzi změnila (přidán p_source, zrušen score_raw),
-- proto DROP před CREATE — CREATE OR REPLACE neumí změnit návratový typ.
DROP FUNCTION IF EXISTS public.fn_prospect_score(UUID, TEXT, NUMERIC, INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.fn_prospect_score(UUID, TEXT, TEXT, NUMERIC, INT, TEXT, TEXT);
CREATE FUNCTION public.fn_prospect_score(
  p_tenant UUID,
  p_source TEXT,
  p_web_status TEXT,
  p_rating NUMERIC,
  p_review_count INT,
  p_phone TEXT,
  p_email TEXT
)
RETURNS TABLE (score INT, priority CHAR(1))
LANGUAGE plpgsql STABLE AS $$
DECLARE
  c_def_weights CONSTANT JSONB := '{"web_status":{"nema":40,"jen_social":30,"zastaraly":25,"ok":5},"review_count":[{"min":50,"pts":20},{"min":20,"pts":15},{"min":5,"pts":10}],"rating":[{"min":4.5,"pts":15},{"min":4.0,"pts":10}],"phone":15,"email":10}'::jsonb;
  c_def_thresholds CONSTANT JSONB := '{"default":{"A":70,"B":50},"osm":{"A":45,"B":30},"web_firmy":{"A":55,"B":40}}'::jsonb;
  v_weights JSONB;
  v_thresholds JSONB;
  v_src JSONB;
  v_raw NUMERIC := 0;
  v_pts NUMERIC;
  v_a NUMERIC;
  v_b NUMERIC;
  v_prio CHAR(1);
BEGIN
  SELECT c.weights, c.thresholds INTO v_weights, v_thresholds
  FROM public.crm_scoring_config c
  WHERE c.tenant_id = p_tenant;

  -- Tvrdé defaulty, aby výpočet nikdy nespadl na chybějící konfiguraci.
  v_weights := COALESCE(v_weights, c_def_weights);
  v_thresholds := COALESCE(v_thresholds, c_def_thresholds);

  -- web_status: přímý lookup v mapě vah.
  IF p_web_status IS NOT NULL THEN
    v_raw := v_raw + public.fn_jsonb_num(v_weights -> 'web_status' -> p_web_status, 0);
  END IF;

  -- review_count: PRVNÍ splněný threshold od nejvyššího.
  IF p_review_count IS NOT NULL THEN
    SELECT public.fn_jsonb_num(e -> 'pts', 0) INTO v_pts
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(v_weights -> 'review_count') = 'array'
                THEN v_weights -> 'review_count' ELSE '[]'::jsonb END) AS e
    WHERE p_review_count >= public.fn_jsonb_num(e -> 'min', 1e9)
    ORDER BY public.fn_jsonb_num(e -> 'min', 0) DESC
    LIMIT 1;
    v_raw := v_raw + COALESCE(v_pts, 0);
  END IF;

  -- rating: PRVNÍ splněný threshold od nejvyššího.
  IF p_rating IS NOT NULL THEN
    SELECT public.fn_jsonb_num(e -> 'pts', 0) INTO v_pts
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(v_weights -> 'rating') = 'array'
                THEN v_weights -> 'rating' ELSE '[]'::jsonb END) AS e
    WHERE p_rating >= public.fn_jsonb_num(e -> 'min', 1e9)
    ORDER BY public.fn_jsonb_num(e -> 'min', 0) DESC
    LIMIT 1;
    v_raw := v_raw + COALESCE(v_pts, 0);
  END IF;

  -- Kontakty: body jen když jsou reálně vyplněné (chybějící kontakt JE
  -- vlastnost leadu a má skóre snižovat).
  IF p_phone IS NOT NULL AND btrim(p_phone) <> '' THEN
    v_raw := v_raw + public.fn_jsonb_num(v_weights -> 'phone', 0);
  END IF;
  IF p_email IS NOT NULL AND btrim(p_email) <> '' THEN
    v_raw := v_raw + public.fn_jsonb_num(v_weights -> 'email', 0);
  END IF;

  -- Prahy pro daný source, fallback na "default", pak na tvrdé 70/50.
  v_src := COALESCE(
    CASE WHEN p_source IS NOT NULL AND jsonb_typeof(v_thresholds -> p_source) = 'object'
         THEN v_thresholds -> p_source END,
    CASE WHEN jsonb_typeof(v_thresholds -> 'default') = 'object'
         THEN v_thresholds -> 'default' END,
    '{"A":70,"B":50}'::jsonb);
  v_a := public.fn_jsonb_num(v_src -> 'A', 70);
  v_b := public.fn_jsonb_num(v_src -> 'B', 50);

  IF v_raw >= v_a THEN v_prio := 'A';
  ELSIF v_raw >= v_b THEN v_prio := 'B';
  ELSE v_prio := 'C';
  END IF;

  RETURN QUERY SELECT GREATEST(ROUND(v_raw), 0)::INT, v_prio;
END $$;

-- ── Trigger na crm_prospects: dopočítá skóre při každém relevantním zápisu ──
-- `source` je v UPDATE OF seznamu proto, že mění PRAHY priority.
CREATE OR REPLACE FUNCTION public.fn_prospects_apply_score()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM public.fn_prospect_score(
    NEW.tenant_id, NEW.source, NEW.web_status, NEW.rating,
    NEW.review_count, NEW.phone, NEW.email
  );
  NEW.score := r.score;
  NEW.priority := r.priority;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prospects_apply_score ON public.crm_prospects;
CREATE TRIGGER trg_prospects_apply_score
  BEFORE INSERT OR UPDATE OF source, web_status, rating, review_count, phone, email
  ON public.crm_prospects
  FOR EACH ROW EXECUTE FUNCTION public.fn_prospects_apply_score();

-- ── Přepočet celého tenantu po změně vah / prahů ────────────────────────
-- Nelze to udělat "dotčením řádků" (SET updated_at = now()), protože trigger
-- výše je `UPDATE OF <konkrétní sloupce>` a na jiných se vůbec nespustí.
-- Nastavujeme jen score/priority → BEFORE UPDATE OF trigger se nespustí
-- (žádná rekurze, žádný dvojí výpočet). Trigger nesahá na config.updated_at.
CREATE OR REPLACE FUNCTION public.fn_scoring_config_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.crm_prospects p
  SET score = f.score,
      priority = f.priority
  FROM (
    SELECT p2.id, s.score, s.priority
    FROM public.crm_prospects p2
    CROSS JOIN LATERAL public.fn_prospect_score(
      p2.tenant_id, p2.source, p2.web_status, p2.rating,
      p2.review_count, p2.phone, p2.email
    ) AS s
    WHERE p2.tenant_id = NEW.tenant_id
  ) AS f
  WHERE p.id = f.id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_scoring_config_recalc ON public.crm_scoring_config;
CREATE TRIGGER trg_scoring_config_recalc
  AFTER UPDATE ON public.crm_scoring_config
  FOR EACH ROW EXECUTE FUNCTION public.fn_scoring_config_recalc();

-- ── Nový tenant dostane defaultní config ────────────────────────────────
-- Bez tohohle by nový tenant neměl řádek a skóre by jelo na tvrdých defaultech
-- ve funkci (fungovalo by, ale nešlo by konfigurovat z UI).
CREATE OR REPLACE FUNCTION public.fn_seed_new_tenant_scoring()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.crm_scoring_config (tenant_id, weights, thresholds)
  VALUES (
    NEW.id,
    '{"web_status":{"nema":40,"jen_social":30,"zastaraly":25,"ok":5},"review_count":[{"min":50,"pts":20},{"min":20,"pts":15},{"min":5,"pts":10}],"rating":[{"min":4.5,"pts":15},{"min":4.0,"pts":10}],"phone":15,"email":10}'::jsonb,
    '{"default":{"A":70,"B":50},"osm":{"A":45,"B":30},"web_firmy":{"A":55,"B":40}}'::jsonb
  )
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_seed_new_tenant_scoring ON public.tenants;
CREATE TRIGGER trg_seed_new_tenant_scoring
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.fn_seed_new_tenant_scoring();
