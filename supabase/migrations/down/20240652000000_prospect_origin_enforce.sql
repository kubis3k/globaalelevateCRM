-- =========================================================================
-- DOWN pro 20240652000000_prospect_origin_enforce.sql
-- NEDESTRUKTIVNÍ vůči datům — ruší jen vynucení existence origin záznamu.
-- Po spuštění lze opět zakládat prospekty bez právní evidence původu.
-- Tohle je únikový východ, pokud enforce migrace rozbije zápisovou cestu.
-- Idempotentní.
-- =========================================================================

DROP TRIGGER IF EXISTS trg_prospect_requires_origin ON public.crm_prospects;
DROP FUNCTION IF EXISTS public.fn_require_origin();
