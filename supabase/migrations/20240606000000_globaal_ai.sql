-- ════════════════════════════════════════════════════════════════════════
--  Globaal AI — company AI chat
--  ai_conversations: one per chat thread. owner_id NULL = shared (whole tenant),
--                    set = private to that user.
--  ai_messages:      messages in a conversation (role user|assistant).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = shared
  title       TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_conversations_tenant_idx ON public.ai_conversations(tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,             -- 'user' | 'assistant'
  content         TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_messages_convo_idx ON public.ai_messages(conversation_id, created_at);

-- ── RLS: tenant isolation; writes go through the service-role server ─────────
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant read ai_conversations" ON public.ai_conversations;
CREATE POLICY "tenant read ai_conversations" ON public.ai_conversations
  FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

DROP POLICY IF EXISTS "tenant manage ai_conversations" ON public.ai_conversations;
CREATE POLICY "tenant manage ai_conversations" ON public.ai_conversations
  FOR ALL USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

DROP POLICY IF EXISTS "tenant read ai_messages" ON public.ai_messages;
CREATE POLICY "tenant read ai_messages" ON public.ai_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id
      AND c.tenant_id IN (SELECT public.get_user_tenant_ids())
  ));
