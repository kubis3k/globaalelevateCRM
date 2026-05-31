-- =========================================================================
-- HR MODULE — personnel, leave, attendance, documents, recruitment
-- Tenant-scoped + RLS. Writes go through the service-role client in server
-- actions; policies are tenant-isolation + admin manage (defense-in-depth).
-- Idempotent: safe to run multiple times.
-- =========================================================================

-- ── Enums ────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.hr_employment_type AS ENUM ('full_time','part_time','contract','intern'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.hr_employee_status AS ENUM ('active','terminated'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.hr_leave_type AS ENUM ('vacation','sick','personal','unpaid'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.hr_leave_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.hr_doc_category AS ENUM ('contract','payslip','id','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.hr_job_status AS ENUM ('open','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.hr_candidate_stage AS ENUM ('applied','screening','interview','offer','hired','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Departments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- ── Employees (HR record extending an auth user) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position TEXT,
  department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  employment_type public.hr_employment_type NOT NULL DEFAULT 'full_time',
  start_date DATE,
  end_date DATE,
  phone TEXT,
  personal_email TEXT,
  address TEXT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  annual_leave_days INTEGER NOT NULL DEFAULT 20,
  salary NUMERIC(12,2),
  salary_currency TEXT NOT NULL DEFAULT 'CZK',
  status public.hr_employee_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- ── Leave requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.hr_leave_type NOT NULL DEFAULT 'vacation',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  working_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  reason TEXT,
  status public.hr_leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Attendance (one row per employee per day) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, work_date)
);

-- ── Documents (metadata; files in private Storage bucket hr-documents) ────
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.hr_doc_category NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Recruitment: job postings + candidates ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  description TEXT,
  status public.hr_job_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.hr_job_postings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  stage public.hr_candidate_stage NOT NULL DEFAULT 'applied',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS: enable + tenant-isolation SELECT + admin manage ─────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr_departments','hr_employees','hr_leave_requests','hr_attendance',
    'hr_documents','hr_job_postings','hr_candidates'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format(
      'CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format(
      'CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));',
      t
    );
  END LOOP;
END $$;

-- ── Private Storage bucket for HR documents ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-documents', 'hr-documents', false)
ON CONFLICT (id) DO NOTHING;
