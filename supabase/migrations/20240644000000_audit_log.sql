-- =========================================================================
-- AUDITNÍ LOG — citlivé akce napříč doménami (finance, HR, oprávnění, portál,
-- smlouvy, mazání dokumentů). Doplňuje existující hr_audit (mzdy). Append-only
-- v praxi (zapisuje jen service-role přes recordAudit). Tenant-scoped + RLS.
-- Idempotentní.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,          -- např. 'finance.transaction.delete'
  entity TEXT,                   -- doména/tabulka, např. 'transactions'
  entity_id TEXT,                -- id dotčeného záznamu
  summary TEXT,                  -- lidsky čitelný popis
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON public.audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(tenant_id, action);

DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY';
  DROP POLICY IF EXISTS "tenant read audit_log" ON public.audit_log;
  CREATE POLICY "tenant read audit_log" ON public.audit_log FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
  DROP POLICY IF EXISTS "admin manage audit_log" ON public.audit_log;
  CREATE POLICY "admin manage audit_log" ON public.audit_log FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = audit_log.tenant_id AND tu.role = 'admin'));
END $$;
