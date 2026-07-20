-- =========================================================================
-- QUOTES — sledování odeslání nabídky pro cron hlídač nečinnosti.
-- sent_at: čas přechodu do stavu 'sent'; stale_reminded_at: guard připomínky.
-- Idempotentní.
-- =========================================================================

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS stale_reminded_at DATE;

CREATE INDEX IF NOT EXISTS idx_quotes_sent ON public.quotes(tenant_id, status, sent_at);
