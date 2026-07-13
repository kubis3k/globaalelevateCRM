-- =========================================================================
-- AKCE — rozpočet (import z Excelu) + rozšíření guest listu o VIP/permostálý
--  event_budget_items — položky rozpočtu akce (kategorie, plán vs. skutečnost)
--  guest_list          — + is_vip, is_permanent (odškrtávací kategorie hosta)
-- Idempotentní. RLS = tenant read + admin manage.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.event_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category TEXT,
  item TEXT NOT NULL,
  planned NUMERIC(12,2),
  actual NUMERIC(12,2),
  note TEXT,
  sort INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS event_budget_items_event_idx ON public.event_budget_items(event_id, sort);

ALTER TABLE public.guest_list ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.guest_list ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.event_budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read event_budget_items" ON public.event_budget_items;
CREATE POLICY "tenant read event_budget_items" ON public.event_budget_items FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "admin manage event_budget_items" ON public.event_budget_items;
CREATE POLICY "admin manage event_budget_items" ON public.event_budget_items FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = event_budget_items.tenant_id AND tu.role = 'admin'));
