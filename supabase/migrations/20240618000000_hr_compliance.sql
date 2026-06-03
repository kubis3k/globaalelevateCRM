-- =========================================================================
-- HR A1 — Compliance & smlouvy/dohody
--  • dohody jako typy úvazku (dpp, dpc)
--  • komp. pole na zaměstnanci (weekly_hours, hourly_rate, personal_no)
--  • hr_contracts (smlouvy/dohody s expirací + akceptací zaměstnancem)
--  • hr_audit (záznam citlivých změn — plat, smlouvy)
-- Idempotentní. Zápisy jdou přes service-role; RLS = tenant read + admin manage.
-- =========================================================================

-- Dohody jako typy úvazku
ALTER TYPE public.hr_employment_type ADD VALUE IF NOT EXISTS 'dpp';
ALTER TYPE public.hr_employment_type ADD VALUE IF NOT EXISTS 'dpc';

-- Komp. pole na zaměstnanci
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS weekly_hours NUMERIC(5,2);
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12,2);
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS personal_no TEXT;

-- Smlouvy / dohody
DO $$ BEGIN CREATE TYPE public.hr_contract_type AS ENUM ('hpp','dpp','dpc','ico','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.hr_contract_status AS ENUM ('draft','active','ended'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.hr_contract_type NOT NULL DEFAULT 'hpp',
  title TEXT,
  start_date DATE,
  end_date DATE,
  weekly_hours NUMERIC(5,2),
  hourly_rate NUMERIC(12,2),
  salary NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'CZK',
  storage_path TEXT,
  status public.hr_contract_status NOT NULL DEFAULT 'active',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expiry_reminded_at DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hr_contracts_tenant_idx ON public.hr_contracts(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS hr_contracts_end_idx ON public.hr_contracts(tenant_id, end_date);

-- Audit citlivých změn
CREATE TABLE IF NOT EXISTS public.hr_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hr_audit_tenant_idx ON public.hr_audit(tenant_id, created_at);

-- RLS (tenant read + admin manage) — service-role zápisy beztak obcházejí RLS
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_contracts','hr_audit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
