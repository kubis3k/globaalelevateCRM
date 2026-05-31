-- ════════════════════════════════════════════════════════════════════════
--  Goals — company milestones + personal goals, by timeframe (week/month/year)
--  milestones:     company-wide (tenant); managed by admins/managers.
--  personal_goals: private per-user (owner-only RLS), in the personal sector.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  timeframe   TEXT NOT NULL DEFAULT 'month',   -- week | month | year
  target_date DATE,
  progress    INT NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT milestones_progress_chk CHECK (progress >= 0 AND progress <= 100)
);
CREATE INDEX IF NOT EXISTS milestones_tenant_idx ON public.milestones(tenant_id, timeframe);

CREATE TABLE IF NOT EXISTS public.personal_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  timeframe   TEXT NOT NULL DEFAULT 'month',
  target_date DATE,
  progress    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT personal_goals_progress_chk CHECK (progress >= 0 AND progress <= 100)
);
CREATE INDEX IF NOT EXISTS personal_goals_user_idx ON public.personal_goals(user_id, timeframe);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read milestones" ON public.milestones;
CREATE POLICY "tenant read milestones" ON public.milestones
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "tenant manage milestones" ON public.milestones;
CREATE POLICY "tenant manage milestones" ON public.milestones
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

ALTER TABLE public.personal_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own personal_goals" ON public.personal_goals;
CREATE POLICY "own personal_goals" ON public.personal_goals
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
