-- =========================================================================
-- PORTAL UPGRADE — zprávy mezi klientem (external) a venue.
-- Tenant-scoped + RLS. Idempotentní.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_tenant ON public.portal_messages(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_messages_user ON public.portal_messages(user_id);

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant read portal_messages" ON public.portal_messages;
CREATE POLICY "tenant read portal_messages" ON public.portal_messages
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
DROP POLICY IF EXISTS "admin manage portal_messages" ON public.portal_messages;
CREATE POLICY "admin manage portal_messages" ON public.portal_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = portal_messages.tenant_id AND tu.role = 'admin'));
