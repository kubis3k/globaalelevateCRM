-- Per-user notification switches for the newly notifying modules (idempotent).
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS events   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS invoices BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS portal   BOOLEAN NOT NULL DEFAULT TRUE;

-- Notify each overdue invoice only once.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;
