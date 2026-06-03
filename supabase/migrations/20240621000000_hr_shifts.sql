-- =========================================================================
-- HR B — Event/směnové plánování
--  hr_shifts             — směna (datum, čas, role, místo, akce/projekt, počet)
--  hr_shift_assignments  — přiřazení zaměstnance na směnu (+ potvrzení)
-- Idempotentní. RLS = tenant read + admin manage.
-- =========================================================================

DO $$ BEGIN CREATE TYPE public.hr_assignment_status AS ENUM ('assigned','confirmed','declined'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.hr_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  role TEXT,
  location TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  required_count INT NOT NULL DEFAULT 1,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hr_shifts_tenant_date_idx ON public.hr_shifts(tenant_id, work_date);

CREATE TABLE IF NOT EXISTS public.hr_shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.hr_shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.hr_assignment_status NOT NULL DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id, user_id)
);
CREATE INDEX IF NOT EXISTS hr_shift_assignments_shift_idx ON public.hr_shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS hr_shift_assignments_user_idx ON public.hr_shift_assignments(tenant_id, user_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_shifts','hr_shift_assignments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
