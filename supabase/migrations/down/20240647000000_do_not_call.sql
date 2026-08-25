-- =========================================================================
-- DOWN pro 20240647000000_do_not_call.sql
-- DESTRUKTIVNÍ VŮČI DATŮM: dropuje celou tabulku crm_do_not_call, tedy
-- evidenci žádostí o nekontaktování. Před spuštěním EXPORTUJ data — jejich
-- ztráta znamená, že můžeme znovu volat lidem, kteří to zakázali.
-- Idempotentní.
-- =========================================================================

-- Nejdřív trigger na crm_prospects (jeho funkce čte crm_do_not_call).
DROP TRIGGER IF EXISTS trg_prospects_enforce_dnc ON public.crm_prospects;
DROP FUNCTION IF EXISTS public.fn_prospects_enforce_dnc();
DROP FUNCTION IF EXISTS public.fn_normalize_phone(TEXT);

DROP TABLE IF EXISTS public.crm_do_not_call;
DROP FUNCTION IF EXISTS public.fn_do_not_call_append_only();
