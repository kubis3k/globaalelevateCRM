-- =========================================================================
-- AKVIZICE — prospekti (scrapnutí/nekvalifikovaní leadi) PŘED CRM klientem.
-- Kadence follow-upů + log doteků + konverze na crm_clients / crm_deals.
-- Tenant-scoped + RLS (tenant read + admin manage; zápisy přes service-role).
-- Idempotentní (musí přežít dvojí spuštění).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.crm_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ico TEXT,
  dic TEXT,
  region TEXT,
  source TEXT NOT NULL DEFAULT 'jine'
    CHECK (source IN ('maps','firmy','rejstrik','referral','ig','osobni','jine')),
  website TEXT,
  email TEXT,
  phone TEXT,
  instagram TEXT,
  score INT NOT NULL DEFAULT 0,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','replied','qualified','converted','dead','nurture')),
  owner UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_touch_at DATE,
  touch_count INT NOT NULL DEFAULT 0,
  converted_client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  note TEXT,
  digest_notified_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_prospect_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'jine'
    CHECK (channel IN ('phone','dm','email','osobne','jine')),
  note TEXT,
  outcome TEXT NOT NULL DEFAULT 'no_reply'
    CHECK (outcome IN ('no_reply','replied','meeting','refused')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.crm_prospects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_prospects_next_touch ON public.crm_prospects(tenant_id, next_touch_at);
CREATE INDEX IF NOT EXISTS idx_prospect_touches_prospect ON public.crm_prospect_touches(prospect_id);
-- Dedup podle IČO v rámci tenantu (jen když je IČO vyplněné).
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospects_ico
  ON public.crm_prospects(tenant_id, ico) WHERE ico IS NOT NULL;

-- ── RLS: enable + tenant-isolation SELECT + admin manage ─────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_prospects','crm_prospect_touches'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "tenant read %1$s" ON public.%1$s FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin manage %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "admin manage %1$s" ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.tenant_id = %1$s.tenant_id AND tu.role = ''admin''));', t);
  END LOOP;
END $$;
