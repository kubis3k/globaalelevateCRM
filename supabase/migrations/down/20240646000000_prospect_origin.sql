-- =========================================================================
-- DOWN pro 20240646000000_prospect_origin.sql
-- DESTRUKTIVNÍ VŮČI DATŮM: dropuje celou tabulku crm_prospect_origin, tedy
-- právní evidenci původu leadů. Před spuštěním zvaž export dat.
-- Idempotentní. (Trigger padá společně s tabulkou.)
-- POZOR: pokud je aplikovaná 20240652 (enforce), spusť nejdřív její down —
-- fn_require_origin() na tuto tabulku odkazuje a bez ní by INSERT prospektu
-- skončil chybou "relation crm_prospect_origin does not exist".
-- =========================================================================

DROP TABLE IF EXISTS public.crm_prospect_origin;
DROP FUNCTION IF EXISTS public.fn_prospect_origin_no_delete();
