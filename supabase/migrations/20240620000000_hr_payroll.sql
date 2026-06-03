-- =========================================================================
-- HR A3 — Mzdy (CZ): konfigurace dle roku, měsíční uzávěrky, položky
--  payroll_config — sazby/prahy na rok (parametrizace; editovatelné v UI)
--  payroll_runs   — měsíční uzávěrka (draft → locked)
--  payroll_items  — řádek na zaměstnance s výpočtem (kontrolní)
-- Idempotentní. RLS = tenant read + admin manage.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.payroll_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year INT NOT NULL,
  sp_emp NUMERIC(6,4) NOT NULL DEFAULT 0.071,
  zp_emp NUMERIC(6,4) NOT NULL DEFAULT 0.045,
  sp_er NUMERIC(6,4) NOT NULL DEFAULT 0.248,
  zp_er NUMERIC(6,4) NOT NULL DEFAULT 0.09,
  tax_rate1 NUMERIC(6,4) NOT NULL DEFAULT 0.15,
  tax_rate2 NUMERIC(6,4) NOT NULL DEFAULT 0.23,
  tax_progress_monthly NUMERIC(12,2) NOT NULL DEFAULT 139671,
  credit_taxpayer NUMERIC(10,2) NOT NULL DEFAULT 2570,
  credit_child1 NUMERIC(10,2) NOT NULL DEFAULT 1267,
  credit_child2 NUMERIC(10,2) NOT NULL DEFAULT 1860,
  credit_child3 NUMERIC(10,2) NOT NULL DEFAULT 2320,
  min_wage_hour NUMERIC(8,2) NOT NULL DEFAULT 134.40,
  dpp_threshold NUMERIC(10,2) NOT NULL DEFAULT 12000,
  dpc_threshold NUMERIC(10,2) NOT NULL DEFAULT 4500,
  srazkova_rate NUMERIC(6,4) NOT NULL DEFAULT 0.15,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, year)
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',          -- draft | locked
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, year, month)
);

CREATE TABLE IF NOT EXISTS public.payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'hpp',
  gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  children INT NOT NULL DEFAULT 0,
  taxpayer_credit BOOLEAN NOT NULL DEFAULT TRUE,
  sp_emp NUMERIC(12,2) NOT NULL DEFAULT 0,
  zp_emp NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  net NUMERIC(12,2) NOT NULL DEFAULT 0,
  sp_er NUMERIC(12,2) NOT NULL DEFAULT 0,
  zp_er NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  regime TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payroll_items_run_idx ON public.payroll_items(run_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['payroll_config','payroll_runs','payroll_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
