-- ════════════════════════════════════════════════════════════════════════
--  Documents module — company-wide document library
--  Files live in a private Storage bucket ('documents'); this table holds
--  metadata + provenance (manual upload vs. saved from a mailbox attachment).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  file_size    BIGINT,
  mime_type    TEXT,
  source       TEXT NOT NULL DEFAULT 'upload',  -- 'upload' | 'mail'
  source_ref   TEXT,                            -- provenance label (e.g. mail from/subject)
  uploaded_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_tenant_idx ON public.documents(tenant_id, created_at DESC);

-- ── RLS: tenant isolation (service-role server actions enforce finer rules) ──
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant read documents" ON public.documents;
CREATE POLICY "tenant read documents" ON public.documents
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

DROP POLICY IF EXISTS "tenant manage documents" ON public.documents;
CREATE POLICY "tenant manage documents" ON public.documents
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- ── Private Storage bucket for documents ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
