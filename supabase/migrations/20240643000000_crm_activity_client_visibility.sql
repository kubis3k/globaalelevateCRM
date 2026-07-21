-- =========================================================================
-- CRM aktivity ↔ klientský portál — propojení komunikace.
-- Staff může interní aktivitu (poznámka/hovor/schůzka/e-mail/úkol) označit
-- jako viditelnou klientovi; zobrazí se mu v portálu společně s jeho vlastními
-- odeslanými zprávami (portal_messages) jako jeden komunikační feed.
-- Idempotentní.
-- =========================================================================

ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_crm_activities_client_visible ON public.crm_activities(client_id, visible_to_client);
