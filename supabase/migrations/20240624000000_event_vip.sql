-- =========================================================================
-- VIP rezervace & guest list (na akci)
--  vip_reservations — rezervace VIP boxů (Diamond/Gold/Silver) + bottle service
--  guest_list       — hosté na akci + check-in na dveřích
-- Idempotentní. RLS = tenant read + admin manage.
-- =========================================================================

DO $$ BEGIN CREATE TYPE public.vip_box AS ENUM ('diamond','gold','silver','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.reservation_status AS ENUM ('pending','confirmed','seated','cancelled','no_show'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.guest_type AS ENUM ('guest','press','artist','staff','promoter'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.vip_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  box_type public.vip_box NOT NULL DEFAULT 'silver',
  box_label TEXT,
  guest_name TEXT,
  contact TEXT,
  party_size INT NOT NULL DEFAULT 2,
  min_spend NUMERIC(12,2),
  deposit NUMERIC(12,2),
  status public.reservation_status NOT NULL DEFAULT 'pending',
  arrived_at TIMESTAMPTZ,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vip_reservations_event_idx ON public.vip_reservations(event_id);

CREATE TABLE IF NOT EXISTS public.guest_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  party_size INT NOT NULL DEFAULT 1,
  type public.guest_type NOT NULL DEFAULT 'guest',
  note TEXT,
  arrived BOOLEAN NOT NULL DEFAULT FALSE,
  arrived_at TIMESTAMPTZ,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS guest_list_event_idx ON public.guest_list(event_id);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['vip_reservations','guest_list'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
