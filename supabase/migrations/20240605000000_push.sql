-- ════════════════════════════════════════════════════════════════════════
--  Web Push notifications
--  - push_subscriptions: one row per browser/device (Web Push endpoint + keys)
--  - notification_prefs:  per-user on/off switches per notification type
--  - mail_poll_state:     last seen INBOX UID per mail account (new-mail detect)
--  - crm_activities.due_reminded_at: idempotence guard for due-date reminders
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  calendar   BOOLEAN NOT NULL DEFAULT true,
  email      BOOLEAN NOT NULL DEFAULT true,
  crm        BOOLEAN NOT NULL DEFAULT true,
  hr         BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mail_poll_state (
  account_id      UUID PRIMARY KEY REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  last_uid        BIGINT,
  last_checked_at TIMESTAMPTZ
);

ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS due_reminded_at DATE;

-- ── RLS: tenant isolation; all writes go through the service-role server ─────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['push_subscriptions','notification_prefs','mail_poll_state'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
  END LOOP;
END $$;

CREATE POLICY "tenant read push_subscriptions" ON public.push_subscriptions
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "tenant read notification_prefs" ON public.notification_prefs
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
-- mail_poll_state is internal-only (service role); RLS on, no policies.
