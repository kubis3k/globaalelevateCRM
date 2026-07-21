-- =========================================================================
-- KLIENTSKÝ PORTÁL v2 — kompletní přestavba access modelu.
--
-- Nahrazuje ruční allowlisty (portal_event_access, portal_document_access)
-- jednotným pravidlem: viditelné = client_id shoduje s klientem přihlášeného
-- portálového uživatele, AND NOT existuje řádek v portal_visibility_overrides.
-- Admin může výjimečně jednotlivou položku skrýt, ale defaultně se vše
-- navázané na klienta zobrazí automaticky (žádné zapomenuté zaškrtávání).
--
-- Přidává: smlouvy (business_contracts už mělo client_id — jen self-akceptace
-- audit), dodávky (deliverables, workflow schválení klientem) a pozvánky
-- e-mailem (portal_invites, klient si sám nastaví heslo).
--
-- Idempotentní. Starý allowlist obsahoval jen testovací data (ověřeno).
-- =========================================================================

-- ── events / documents dostávají vazbu na klienta (chybělo úplně) ────────
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_client ON public.events(client_id);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.documents(client_id);

-- ── business_contracts: lehký audit trail pro self-akceptaci klientem ────
ALTER TABLE public.business_contracts ADD COLUMN IF NOT EXISTS acknowledged_ip TEXT;

-- ── Generická "skrývací" tabulka — nahrazuje 2 allowlisty jedním modelem ──
CREATE TABLE IF NOT EXISTS public.portal_visibility_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('event','document','contract','deliverable')),
  item_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, item_type, item_id)
);

-- ── Dodávky (odevzdávání práce) — workflow schválení klientem ────────────
CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','changes_requested')),
  client_comment TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_client ON public.deliverables(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON public.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_event ON public.deliverables(event_id);

-- ── Pozvánky do portálu e-mailem (klient si sám nastaví heslo) ───────────
CREATE TABLE IF NOT EXISTS public.portal_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_portal_invites_tenant ON public.portal_invites(tenant_id, used_at);

-- ── Staré ruční allowlisty — nahrazeny modelem výše (jen testovací data) ─
DROP TABLE IF EXISTS public.portal_event_access CASCADE;
DROP TABLE IF EXISTS public.portal_document_access CASCADE;

-- ── RLS: standardní vzor (tenant read + admin manage) ────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['portal_visibility_overrides','deliverables'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;

-- portal_invites: ŽÁDNÁ tenant-read politika — token nesmí být čitelný
-- jiným členem tenantu (stejný precedens jako mail_poll_state). Jen admin
-- manage; veřejné /invite/[token] čtení jde přes service-role klienta.
ALTER TABLE public.portal_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin manage portal_invites" ON public.portal_invites;
CREATE POLICY "admin manage portal_invites" ON public.portal_invites FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = portal_invites.tenant_id AND tu.role = 'admin'));
