-- =========================================================================
-- DOWN pro 20240653000000_prospect_region_fk.sql
-- NEDESTRUKTIVNÍ vůči datům — ruší jen integritní vazbu, region zůstává
-- textovým sloupcem s dosavadními hodnotami.
-- Idempotentní.
-- =========================================================================

ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_region_fkey;
