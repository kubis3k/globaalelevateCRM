-- =========================================================================
-- HR A2 — Onboarding / offboarding checklisty
--  hr_checklists       — šablony (onboarding | offboarding)
--  hr_checklist_items  — položky šablony
--  hr_checklist_runs   — přiřazení šablony konkrétnímu zaměstnanci
--  hr_checklist_run_items — odbavované položky běhu
-- Idempotentní. RLS = tenant read + admin manage.
-- =========================================================================

DO $$ BEGIN CREATE TYPE public.hr_checklist_kind AS ENUM ('onboarding','offboarding'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.hr_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.hr_checklist_kind NOT NULL DEFAULT 'onboarding',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.hr_checklists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_checklist_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES public.hr_checklists(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind public.hr_checklist_kind NOT NULL DEFAULT 'onboarding',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hr_checklist_runs_tenant_idx ON public.hr_checklist_runs(tenant_id, user_id);

CREATE TABLE IF NOT EXISTS public.hr_checklist_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.hr_checklist_runs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS hr_checklist_run_items_run_idx ON public.hr_checklist_run_items(run_id, sort);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_checklists','hr_checklist_items','hr_checklist_runs','hr_checklist_run_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
