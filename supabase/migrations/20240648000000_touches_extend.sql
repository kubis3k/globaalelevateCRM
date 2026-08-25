-- =========================================================================
-- LEADY (PR2a) — rozšíření crm_prospect_touches: záznam přechodu stavu
-- (status_before/after), délka hovoru, datum nastaveného dalšího doteku
-- + nové výsledky doteku (callback, do_not_call) + indexy pro timeline.
-- Idempotentní.
-- DOWN: down/20240648000000_touches_extend.sql
-- =========================================================================

ALTER TABLE public.crm_prospect_touches ADD COLUMN IF NOT EXISTS status_before TEXT;
ALTER TABLE public.crm_prospect_touches ADD COLUMN IF NOT EXISTS status_after TEXT;
ALTER TABLE public.crm_prospect_touches ADD COLUMN IF NOT EXISTS duration_s INT;
ALTER TABLE public.crm_prospect_touches ADD COLUMN IF NOT EXISTS next_touch_set_at DATE;

ALTER TABLE public.crm_prospect_touches DROP CONSTRAINT IF EXISTS crm_prospect_touches_duration_s_check;
ALTER TABLE public.crm_prospect_touches ADD CONSTRAINT crm_prospect_touches_duration_s_check
  CHECK (duration_s >= 0);

-- Rozšíření outcome: callback = domluvený zpětný kontakt,
-- do_not_call = lead si vyžádal nekontaktování.
ALTER TABLE public.crm_prospect_touches DROP CONSTRAINT IF EXISTS crm_prospect_touches_outcome_check;
ALTER TABLE public.crm_prospect_touches ADD CONSTRAINT crm_prospect_touches_outcome_check
  CHECK (outcome IN ('no_reply','replied','meeting','refused','callback','do_not_call'));

CREATE INDEX IF NOT EXISTS idx_prospect_touches_tenant_created
  ON public.crm_prospect_touches(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prospect_touches_prospect_created
  ON public.crm_prospect_touches(prospect_id, created_at DESC);
