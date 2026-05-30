-- Povolení UUID extenze
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TENANTS (Firmy)
-- ==========================================
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. ROLES (Oprávnění)
-- ==========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee', 'external');

-- ==========================================
-- 3. TENANT_USERS (Propojení Uživatelů a Firem)
-- ==========================================
CREATE TABLE public.tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'employee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- ==========================================
-- 4. INVOICES (Faktury)
-- ==========================================
CREATE TYPE public.invoice_type AS ENUM ('issued', 'received');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type public.invoice_type NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    invoice_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CZK',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 5. TRANSACTIONS (Live Finance)
-- ==========================================
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CZK',
    type public.transaction_type NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 6. CALENDAR_EVENTS (Sdílený Kalendář)
-- ==========================================
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    assigned_role public.app_role,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - BEZPEČNOST A IZOLACE
-- =========================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid();
$$;

-- Tenants: Uživatel vidí pouze firmy (tenanty), do kterých patří.
CREATE POLICY "Users can view their tenants" ON public.tenants
    FOR SELECT USING (id IN (SELECT public.get_user_tenant_ids()));

-- Tenant Users: Uživatel vidí ostatní členy firmy.
CREATE POLICY "Users can view tenant members" ON public.tenant_users
    FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- Tenant Users: Pouze administrátoři firmy mohou přidávat, upravovat a mazat členy.
CREATE POLICY "Admins can manage tenant users" ON public.tenant_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tenant_users tu 
            WHERE tu.user_id = auth.uid() 
            AND tu.tenant_id = tenant_users.tenant_id 
            AND tu.role = 'admin'
        )
    );

-- Invoices: Striktní izolace faktur - každý vidí/edituje jen faktury svého tenantu.
CREATE POLICY "Tenant isolation for invoices" ON public.invoices
    FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- Transactions: Striktní izolace financí - každý vidí/edituje jen finance svého tenantu.
CREATE POLICY "Tenant isolation for transactions" ON public.transactions
    FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- Calendar: Striktní izolace kalendáře - každý vidí/edituje jen kalendář svého tenantu.
CREATE POLICY "Tenant isolation for calendar" ON public.calendar_events
    FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
