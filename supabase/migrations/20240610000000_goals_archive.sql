-- Archive flag for goals — completed/expired goals can be moved to history
-- instead of cluttering the active board.
ALTER TABLE public.milestones      ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.personal_goals  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS milestones_archived_idx     ON public.milestones(tenant_id, archived);
CREATE INDEX IF NOT EXISTS personal_goals_archived_idx ON public.personal_goals(user_id, archived);
