-- =========================================================================
-- TIME TRACKING MODULE — výkazy práce. Odpracované hodiny vykázané na projekt
-- (a volitelně konkrétní úkol), s příznakem fakturovatelnosti a sazbou.
-- Tenant-scoped + RLS (tenant read + admin manage; zápisy přes service-role).
-- Idempotentní.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  work_date DATE NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  description TEXT,
  billable BOOLEAN NOT NULL DEFAULT true,
  hourly_rate NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'CZK',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON public.time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id);

-- ── RLS: enable + tenant-isolation SELECT + admin manage ─────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['time_entries'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
