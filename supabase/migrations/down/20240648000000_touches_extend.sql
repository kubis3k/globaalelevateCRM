-- =========================================================================
-- DOWN pro 20240648000000_touches_extend.sql
-- DESTRUKTIVNÍ VŮČI DATŮM: dropuje sloupce status_before, status_after,
-- duration_s a next_touch_set_at z crm_prospect_touches.
-- Navíc: obnovuje původní outcome CHECK — pokud v tabulce už existují doteky
-- s outcome 'callback' nebo 'do_not_call', ADD CONSTRAINT SELŽE (a tím se
-- rollbackne celý soubor). Ty řádky je nutné nejdřív ručně přemapovat.
-- Idempotentní.
-- =========================================================================

ALTER TABLE public.crm_prospect_touches DROP CONSTRAINT IF EXISTS crm_prospect_touches_duration_s_check;

-- Obnovení PŮVODNÍHO znění (stav před PR2a).
-- POZOR — ZTRÁTA INFORMACE: outcome 'callback' a 'do_not_call' v původním
-- číselníku nejsou, takže se přemapují ('callback' -> 'no_reply', protože
-- hovor reálně nikam nevedl; 'do_not_call' -> 'refused'). Bez toho by zúžení
-- CHECKu spadlo na existujících doteků. Doteky jsou append-only, ale UPDATE
-- jde z migrace (trigger blokuje jen běžný provoz, ne owner session) — což je
-- přesně ta slabina append-only ochrany, kterou jsme vědomě přijali.
--   SELECT id, prospect_id, outcome FROM crm_prospect_touches
--   WHERE outcome IN ('callback','do_not_call');
-- Trigger vypínáme jen pokud vůbec existuje: při rollbacku v reverzním pořadí
-- ho už smazala down/20240649, a `ALTER TABLE ... DISABLE TRIGGER` na
-- neexistující trigger je chyba (PG nemá DISABLE TRIGGER IF EXISTS).
DO $do$
DECLARE v_has BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'crm_prospect_touches'
      AND t.tgname = 'trg_touches_append_only' AND NOT t.tgisinternal
  ) INTO v_has;

  IF v_has THEN
    EXECUTE 'ALTER TABLE public.crm_prospect_touches DISABLE TRIGGER trg_touches_append_only';
  END IF;

  UPDATE public.crm_prospect_touches SET outcome = 'no_reply' WHERE outcome = 'callback';
  UPDATE public.crm_prospect_touches SET outcome = 'refused' WHERE outcome = 'do_not_call';

  IF v_has THEN
    EXECUTE 'ALTER TABLE public.crm_prospect_touches ENABLE TRIGGER trg_touches_append_only';
  END IF;
END $do$;
ALTER TABLE public.crm_prospect_touches DROP CONSTRAINT IF EXISTS crm_prospect_touches_outcome_check;
ALTER TABLE public.crm_prospect_touches ADD CONSTRAINT crm_prospect_touches_outcome_check
  CHECK (outcome IN ('no_reply','replied','meeting','refused'));

DROP INDEX IF EXISTS public.idx_prospect_touches_tenant_created;
DROP INDEX IF EXISTS public.idx_prospect_touches_prospect_created;

ALTER TABLE public.crm_prospect_touches DROP COLUMN IF EXISTS status_before;
ALTER TABLE public.crm_prospect_touches DROP COLUMN IF EXISTS status_after;
ALTER TABLE public.crm_prospect_touches DROP COLUMN IF EXISTS duration_s;
ALTER TABLE public.crm_prospect_touches DROP COLUMN IF EXISTS next_touch_set_at;
