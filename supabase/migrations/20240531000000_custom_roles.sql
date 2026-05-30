-- Custom roles table for tenant-specific roles with module permissions
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  modules JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Add custom_role_id to tenant_users
ALTER TABLE public.tenant_users
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL;

-- Seed default roles for existing tenants
INSERT INTO public.custom_roles (tenant_id, name, description, color, modules)
SELECT
  id,
  'Marketing',
  'Přístup ke kalendáři a fakturám',
  '#8b5cf6',
  '["dashboard","calendar","invoices"]'::jsonb
FROM public.tenants
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_roles (tenant_id, name, description, color, modules)
SELECT
  id,
  'Účetnictví',
  'Přístup k financím a fakturám',
  '#10b981',
  '["dashboard","finance","invoices"]'::jsonb
FROM public.tenants
ON CONFLICT DO NOTHING;
