-- =========================================================================
-- COMPANY SETTINGS — fakturační údaje firmy (dodavatel) pro ISDOC/faktury.
-- Jeden řádek na tenant. + VAT sloupce na fakturách (pro přesný ISDOC).
-- Tenant-scoped + RLS (tenant read + admin manage). Idempotentní.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.company_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  legal_name TEXT,
  ico TEXT,
  dic TEXT,
  vat_payer BOOLEAN NOT NULL DEFAULT true,
  default_vat_rate NUMERIC(5,2) NOT NULL DEFAULT 21,
  street TEXT,
  city TEXT,
  zip TEXT,
  country TEXT NOT NULL DEFAULT 'CZ',
  bank_account TEXT,
  iban TEXT,
  email TEXT,
  phone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VAT rozpad na fakturách (vyplní se při převodu z nabídky; jinak NULL).
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read company_settings" ON public.company_settings;
CREATE POLICY "tenant read company_settings" ON public.company_settings
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "admin manage company_settings" ON public.company_settings;
CREATE POLICY "admin manage company_settings" ON public.company_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = company_settings.tenant_id AND tu.role = 'admin'));
