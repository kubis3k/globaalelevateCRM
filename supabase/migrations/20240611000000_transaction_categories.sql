-- Finance: categories for transactions + a category reference on transactions.
CREATE TABLE IF NOT EXISTS public.transaction_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS transactions_category_idx ON public.transactions(tenant_id, category_id);

ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read transaction_categories" ON public.transaction_categories;
CREATE POLICY "tenant read transaction_categories" ON public.transaction_categories
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "tenant manage transaction_categories" ON public.transaction_categories;
CREATE POLICY "tenant manage transaction_categories" ON public.transaction_categories
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
