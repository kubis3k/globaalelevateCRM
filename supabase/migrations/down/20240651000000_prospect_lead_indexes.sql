-- =========================================================================
-- DOWN pro 20240651000000_prospect_lead_indexes.sql
-- NEDESTRUKTIVNÍ vůči datům — dropuje jen indexy (dopad je čistě výkonový).
-- Idempotentní.
-- =========================================================================

DROP INDEX IF EXISTS public.idx_prospects_owner_next_touch;
DROP INDEX IF EXISTS public.idx_prospects_industry_region;
DROP INDEX IF EXISTS public.idx_prospects_priority_score;
DROP INDEX IF EXISTS public.idx_prospects_phone;
