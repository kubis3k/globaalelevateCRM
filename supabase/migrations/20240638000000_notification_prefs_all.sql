-- Ensure every push notification type has a per-user switch column (idempotent),
-- so the prefs UI + gating work for all types and nothing silently drops.
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS calendar BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS email    BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS crm      BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS hr       BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS projects BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS social   BOOLEAN NOT NULL DEFAULT TRUE;
