-- =========================================================================
-- DODAVATELÉ & OBJEDNÁVKY (PO) — dodavatelé (umělci/security/půjčovny/nápoje)
-- + objednávky s položkami, volitelně navázané na akci; zaúčtování do Financí.
-- Tenant-scoped + RLS (tenant read + admin manage; zápisy přes service-role).
-- Idempotentní.
-- =========================================================================

DO $$ BEGIN CREATE TYPE public.supplier_category AS ENUM ('artist','security','rental','drinks','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.po_status AS ENUM ('draft','sent','confirmed','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.supplier_category NOT NULL DEFAULT 'other',
  ico TEXT,
  dic TEXT,
  email TEXT,
  phone TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  status public.po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  currency TEXT NOT NULL DEFAULT 'CZK',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_tenant ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_event ON public.purchase_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(po_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['suppliers','purchase_orders','purchase_order_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
