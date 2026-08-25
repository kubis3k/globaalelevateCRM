-- =========================================================================
-- DOWN pro 20240649000000_touches_append_only.sql
-- NEDESTRUKTIVNÍ vůči datům — ruší jen ochranu (trigger + funkci) a vrací
-- práva UPDATE/DELETE. Po spuštění lze doteky editovat a mazat.
-- Idempotentní.
-- =========================================================================

DROP TRIGGER IF EXISTS trg_touches_append_only ON public.crm_prospect_touches;
DROP FUNCTION IF EXISTS public.fn_touches_append_only();
-- POZN.: GRANT zpět se ZÁMĚRNĚ nedělá. Up migrace dělala jen `REVOKE ... FROM
-- PUBLIC`, což byl no-op (PUBLIC ta práva nikdy neměl). `GRANT ... TO PUBLIC`
-- by tedy nic neobnovoval, jen by rozdal zápisová práva všem rolím v DB.
