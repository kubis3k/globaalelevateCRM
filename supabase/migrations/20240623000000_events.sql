-- =========================================================================
-- AKCE / Produkční hub — events + line-up + run-of-show
--  events         — akce (datum, časy, místo, kapacita, rozpočet, technika)
--  event_lineup   — line-up umělců / vystoupení (slot, honorář, stav)
--  event_timeline — run-of-show (časový plán akce)
-- Idempotentní. RLS = tenant read + admin manage.
-- =========================================================================

DO $$ BEGIN CREATE TYPE public.event_status AS ENUM ('planning','confirmed','done','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE,
  doors_time TIME,
  start_time TIME,
  end_time TIME,
  location TEXT,
  capacity INT,
  client TEXT,
  status public.event_status NOT NULL DEFAULT 'planning',
  budget NUMERIC(12,2),
  tech_notes TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_tenant_date_idx ON public.events(tenant_id, event_date);

CREATE TABLE IF NOT EXISTS public.event_lineup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  slot_start TIME,
  slot_end TIME,
  fee NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'booked',
  note TEXT,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS event_lineup_event_idx ON public.event_lineup(event_id, sort);

CREATE TABLE IF NOT EXISTS public.event_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  at_time TIME,
  item TEXT NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS event_timeline_event_idx ON public.event_timeline(event_id, sort);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['events','event_lineup','event_timeline'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
