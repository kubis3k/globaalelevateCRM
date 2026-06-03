-- =========================================================================
-- BUSINESS SMLOUVY — smlouvy s NE-zaměstnanci (umělci, pronájmy, dodavatelé,
-- klienti). Doplňuje HR smlouvy (zaměstnanci). Expirace + e-akceptace.
-- Vazba na dodavatele / CRM klienta / akci. Tenant-scoped + RLS. Idempotentní.
-- =========================================================================

DO $$ BEGIN CREATE TYPE public.bc_party_type AS ENUM ('artist','rental','supplier','client','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.bc_status AS ENUM ('draft','active','expired','terminated'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.business_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  party_type public.bc_party_type NOT NULL DEFAULT 'other',
  counterparty TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  type TEXT,
  status public.bc_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  value NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'CZK',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bc_tenant ON public.business_contracts(tenant_id, end_date);
CREATE INDEX IF NOT EXISTS idx_bc_supplier ON public.business_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_bc_client ON public.business_contracts(client_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_contracts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
