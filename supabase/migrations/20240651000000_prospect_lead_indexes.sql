-- =========================================================================
-- LEADY (PR2a) — indexy pro hlavní pohledy nad prospekty:
-- "moje dnešní kadence", filtr obor+kraj, prioritní fronta, dedup podle telefonu.
-- Idempotentní.
-- POZOR: NIKDY zde nepoužívat CREATE INDEX CONCURRENTLY — apply-migration.mjs
-- posílá celý soubor jako jeden simple query (implicitní transakce).
-- DOWN: down/20240651000000_prospect_lead_indexes.sql
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_prospects_owner_next_touch
  ON public.crm_prospects(tenant_id, owner, next_touch_at);

CREATE INDEX IF NOT EXISTS idx_prospects_industry_region
  ON public.crm_prospects(tenant_id, industry, region);

CREATE INDEX IF NOT EXISTS idx_prospects_priority_score
  ON public.crm_prospects(tenant_id, priority, score DESC);

CREATE INDEX IF NOT EXISTS idx_prospects_phone
  ON public.crm_prospects(tenant_id, phone)
  WHERE phone IS NOT NULL;
