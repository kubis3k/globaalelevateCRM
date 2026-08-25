-- =========================================================================
-- LEADY (PR2a) — číselníky (kraje ČR, obory) + rozšíření crm_prospects
-- o kvalifikační atributy (obor, město, stav webu, rating, počet recenzí,
-- priorita) + FK na číselník oborů a rozšíření CHECK constraintů.
-- Idempotentní (musí přežít opakované spuštění).
-- DOWN: down/20240645000000_prospect_codebooks.sql
--
-- POZOR: RLS na této DB je vědomě neutralizované (izolace tenantů je
-- aplikační) → tato migrace ŽÁDNÉ policy nezakládá.
--
-- POZOR: FK `region → cz_regions(code)` zde ZÁMĚRNĚ NENÍ. Formulář prospektů
-- (prospects-client.tsx) i import route dnes posílají `region` jako volný text
-- ("Praha"), takže FK by okamžitě rozbil ukládání. Číselník cz_regions se tu
-- zakládá a plní, FK přijde až migrací 20240653000000_prospect_region_fk.sql
-- po přepnutí UI/importu na kódy krajů.
-- =========================================================================

-- ── Kraje ČR (globální číselník, není tenant-scoped) ─────────────────────
CREATE TABLE IF NOT EXISTS public.cz_regions (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort INT NOT NULL
);

INSERT INTO public.cz_regions (code, label, sort) VALUES
  ('PHA', 'Hlavní město Praha',      1),
  ('STC', 'Středočeský kraj',        2),
  ('JHC', 'Jihočeský kraj',          3),
  ('PLK', 'Plzeňský kraj',           4),
  ('KVK', 'Karlovarský kraj',        5),
  ('ULK', 'Ústecký kraj',            6),
  ('LBK', 'Liberecký kraj',          7),
  ('HKK', 'Královéhradecký kraj',    8),
  ('PAK', 'Pardubický kraj',         9),
  ('VYS', 'Kraj Vysočina',          10),
  ('JHM', 'Jihomoravský kraj',      11),
  ('OLK', 'Olomoucký kraj',         12),
  ('ZLK', 'Zlínský kraj',           13),
  ('MSK', 'Moravskoslezský kraj',   14)
ON CONFLICT (code) DO NOTHING;

-- ── Obory (tenant-scoped číselník) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, code)
);

-- Seed 7 základních oborů pro každý EXISTUJÍCÍ tenant.
INSERT INTO public.crm_industries (tenant_id, code, label, sort)
SELECT t.id, v.code, v.label, v.sort
FROM public.tenants t
CROSS JOIN (VALUES
  ('gastro',  'Gastro a restaurace',      10),
  ('barber',  'Barbershopy a holičství',  20),
  ('beauty',  'Beauty a kosmetika',       30),
  ('fitness', 'Fitness a wellness',       40),
  ('auto',    'Autoservisy a autodíly',   50),
  ('zdravi',  'Zdraví a zdravotní péče',  60),
  ('remesla', 'Řemesla a stavebnictví',   70)
) AS v(code, label, sort)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ── Seed oborů pro NOVĚ vznikající tenanty ──────────────────────────────
-- Bez toho by nový tenant neměl v číselníku nic a composite FK níže by odmítl
-- jakoukoli neprázdnou `industry` (v aplikačním kódu obory nikdo nezakládá).
-- Seed řádku do crm_scoring_config řeší SAMOSTATNÝ trigger v migraci 20240650 —
-- záměrně nesdílíme jednu trigger funkci, protože crm_scoring_config v tomto
-- bodě ještě neexistuje a opakované spuštění 20240645 by CREATE OR REPLACE
-- funkci vrátilo do verze bez seedu configu (skrytá regrese).
CREATE OR REPLACE FUNCTION public.fn_seed_new_tenant_industries()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.crm_industries (tenant_id, code, label, sort)
  SELECT NEW.id, v.code, v.label, v.sort
  FROM (VALUES
    ('gastro',  'Gastro a restaurace',      10),
    ('barber',  'Barbershopy a holičství',  20),
    ('beauty',  'Beauty a kosmetika',       30),
    ('fitness', 'Fitness a wellness',       40),
    ('auto',    'Autoservisy a autodíly',   50),
    ('zdravi',  'Zdraví a zdravotní péče',  60),
    ('remesla', 'Řemesla a stavebnictví',   70)
  ) AS v(code, label, sort)
  ON CONFLICT (tenant_id, code) DO NOTHING;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_seed_new_tenant_industries ON public.tenants;
CREATE TRIGGER trg_seed_new_tenant_industries
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.fn_seed_new_tenant_industries();

-- ── Nové sloupce na crm_prospects ───────────────────────────────────────
ALTER TABLE public.crm_prospects ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.crm_prospects ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.crm_prospects ADD COLUMN IF NOT EXISTS web_status TEXT;
ALTER TABLE public.crm_prospects ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);
ALTER TABLE public.crm_prospects ADD COLUMN IF NOT EXISTS review_count INT;
-- last_touch_at dnes NIKDO neplní — zavede ho `logTouch` v pozdějším PR
-- (PR2b), kde se zápis doteku a update prospektu spojí do jedné transakce.
-- last_touch_at dnes NIKDO neplní — logTouch v prospects/actions.ts ho nenastavuje.
-- Plnit ho začne přepsaný logTouch v PR5 (fronta hovorů). Sloupec zavádíme už
-- teď, aby na něm mohl stát index a řazení fronty.
ALTER TABLE public.crm_prospects ADD COLUMN IF NOT EXISTS last_touch_at TIMESTAMPTZ;
ALTER TABLE public.crm_prospects ADD COLUMN IF NOT EXISTS priority CHAR(1);

-- ── CHECK constrainty (drop + add kvůli idempotenci) ────────────────────
-- Všechny povolují NULL (neznámý údaj je legitimní stav u OSM/scrape zdrojů).
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_web_status_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_web_status_check
  CHECK (web_status IN ('nema','jen_social','zastaraly','ok'));

ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_rating_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_rating_check
  CHECK (rating BETWEEN 0 AND 5);

ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_review_count_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_review_count_check
  CHECK (review_count >= 0);

ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_priority_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_priority_check
  CHECK (priority IN ('A','B','C'));

-- Rozšíření source o nové zdroje (osm = OpenStreetMap, web_firmy = scrape firemních katalogů).
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_source_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_source_check
  CHECK (source IN ('maps','firmy','rejstrik','referral','ig','osobni','jine','osm','web_firmy'));

-- Rozšíření status o do_not_call (lead si vyžádal nekontaktování).
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_status_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_status_check
  CHECK (status IN ('new','contacted','replied','qualified','converted','dead','nurture','do_not_call'));

-- ── Composite FK na číselník oborů ──────────────────────────────────────
-- Obor musí existovat v číselníku TÉHOŽ tenantu.
-- MATCH SIMPLE (default) → když je industry NULL, constraint je splněn.
--
-- DEFERRABLE INITIALLY DEFERRED je tu nutnost, ne kosmetika: crm_industries
-- i crm_prospects jsou obě child tabulky tenants s ON DELETE CASCADE a pořadí
-- kaskád mezi nimi není definované. Kdyby se nejdřív smazaly obory, NO ACTION
-- FK by při rušení tenanta spadl na FK violation. Odloženou kontrolou se FK
-- vyhodnotí na konci transakce, kdy už jsou smazané obě strany.
-- (ON DELETE SET NULL nejde — složený FK by nulloval i tenant_id, které je NOT NULL.)
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_industry_fkey;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_industry_fkey
  FOREIGN KEY (tenant_id, industry) REFERENCES public.crm_industries(tenant_id, code)
  DEFERRABLE INITIALLY DEFERRED;
