-- ════════════════════════════════════════════════════════════════════════
--  Sociální sítě — connected accounts, follower-count history, scheduled posts
--  social_accounts: one row per connected profile (IG/FB/TikTok/YT/X/…)
--  social_metrics:  follower-count snapshots over time (growth charts)
--  social_posts:    drafts + scheduled/published posts across platforms
-- ════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE public.social_platform AS ENUM
    ('instagram','facebook','tiktok','youtube','x','linkedin','threads','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.social_post_status AS ENUM ('draft','scheduled','published','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform         public.social_platform NOT NULL,
  handle           TEXT,
  display_name     TEXT,
  profile_url      TEXT,
  followers        INT NOT NULL DEFAULT 0,
  following        INT NOT NULL DEFAULT 0,
  posts_count      INT NOT NULL DEFAULT 0,
  access_token_enc TEXT,                       -- reserved for live API sync
  auto_sync        BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at   TIMESTAMPTZ,
  connected_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS social_accounts_tenant_idx ON public.social_accounts(tenant_id, platform);

CREATE TABLE IF NOT EXISTS public.social_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  followers   INT NOT NULL DEFAULT 0,
  following   INT NOT NULL DEFAULT 0,
  posts_count INT NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS social_metrics_acc_idx ON public.social_metrics(account_id, captured_at);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content      TEXT,
  media_doc_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  media_name   TEXT,
  platforms    public.social_platform[] NOT NULL DEFAULT '{}',
  status       public.social_post_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  notified_at  TIMESTAMPTZ,
  error        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS social_posts_tenant_idx ON public.social_posts(tenant_id, status, scheduled_at);

-- Per-user push switch for the new 'social' notification type (defaults on).
ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS social BOOLEAN NOT NULL DEFAULT TRUE;

-- ── RLS (defense-in-depth; service-role server actions do the real writes) ──
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read social_accounts" ON public.social_accounts;
CREATE POLICY "tenant read social_accounts" ON public.social_accounts
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "tenant manage social_accounts" ON public.social_accounts;
CREATE POLICY "tenant manage social_accounts" ON public.social_accounts
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read social_metrics" ON public.social_metrics;
CREATE POLICY "tenant read social_metrics" ON public.social_metrics
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "tenant manage social_metrics" ON public.social_metrics;
CREATE POLICY "tenant manage social_metrics" ON public.social_metrics
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read social_posts" ON public.social_posts;
CREATE POLICY "tenant read social_posts" ON public.social_posts
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "tenant manage social_posts" ON public.social_posts;
CREATE POLICY "tenant manage social_posts" ON public.social_posts
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
