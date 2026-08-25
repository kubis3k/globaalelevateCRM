-- =========================================================================
-- DOWN pro 20240650000000_scoring_config.sql
-- DESTRUKTIVNÍ vůči konfiguraci: ruší tabulku crm_scoring_config (váhy, prahy,
-- kadence se ztratí). Hodnoty score / priority na crm_prospects ZŮSTÁVAJÍ jako
-- statická data, jen se přestanou přepočítávat.
-- POZOR: spusť tuto down migraci PŘED down/20240645000000 — jinak by trigger
-- trg_prospects_apply_score (UPDATE OF ... web_status) blokoval DROP COLUMN.
-- Idempotentní.
-- =========================================================================

DROP TRIGGER IF EXISTS trg_seed_new_tenant_scoring ON public.tenants;
DROP FUNCTION IF EXISTS public.fn_seed_new_tenant_scoring();

DROP TRIGGER IF EXISTS trg_scoring_config_recalc ON public.crm_scoring_config;
DROP FUNCTION IF EXISTS public.fn_scoring_config_recalc();

DROP TRIGGER IF EXISTS trg_prospects_apply_score ON public.crm_prospects;
DROP FUNCTION IF EXISTS public.fn_prospects_apply_score();

-- Obě historické signatury (první verze migrace měla score_raw a neměla p_source).
DROP FUNCTION IF EXISTS public.fn_prospect_score(UUID, TEXT, TEXT, NUMERIC, INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.fn_prospect_score(UUID, TEXT, NUMERIC, INT, TEXT, TEXT);

DROP FUNCTION IF EXISTS public.fn_jsonb_num(JSONB, NUMERIC);

DROP TABLE IF EXISTS public.crm_scoring_config;
