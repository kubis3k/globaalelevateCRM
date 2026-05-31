-- ════════════════════════════════════════════════════════════════════════
--  Osobní sektor — private per-user space (notes, tasks, personal calendar).
--  Every row is owned by one user; RLS restricts visibility to that user only,
--  separate from the shared/company data.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.personal_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  content     TEXT NOT NULL DEFAULT '',
  pinned      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personal_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  note          TEXT,
  due_date      DATE,
  priority      TEXT NOT NULL DEFAULT 'normal',  -- low | normal | high
  done          BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.personal_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  all_day      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS personal_notes_user_idx  ON public.personal_notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS personal_tasks_user_idx  ON public.personal_tasks(user_id, done, due_date);
CREATE INDEX IF NOT EXISTS personal_events_user_idx ON public.personal_events(user_id, start_time);

-- ── RLS: strictly owner-only (private), regardless of tenant role ────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['personal_notes','personal_tasks','personal_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "own %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "own %1$s" ON public.%1$s FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', t);
  END LOOP;
END $$;
