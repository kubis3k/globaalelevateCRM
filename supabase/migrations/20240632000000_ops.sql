-- =========================================================================
-- PROVOZ — SOP / wiki články + provozní checklisty (šablony + běhy).
-- Otevření/zavření klubu, nouzové postupy, barové recepty; checklisty pro směnaře.
-- Tenant-scoped + RLS (tenant read + admin manage; zápisy přes service-role).
-- Idempotentní.
-- =========================================================================

DO $$ BEGIN CREATE TYPE public.sop_category AS ENUM ('open','close','emergency','bar','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.sop_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category public.sop_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  body TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ops_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.sop_category NOT NULL DEFAULT 'other',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ops_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.ops_checklists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ops_checklist_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES public.ops_checklists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ops_checklist_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.ops_checklist_runs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_tenant ON public.sop_articles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ops_checklist_items_cl ON public.ops_checklist_items(checklist_id, sort);
CREATE INDEX IF NOT EXISTS idx_ops_runs_tenant ON public.ops_checklist_runs(tenant_id, run_date);
CREATE INDEX IF NOT EXISTS idx_ops_run_items_run ON public.ops_checklist_run_items(run_id, sort);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sop_articles','ops_checklists','ops_checklist_items','ops_checklist_runs','ops_checklist_run_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
