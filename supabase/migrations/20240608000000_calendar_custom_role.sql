-- Allow assigning a shared calendar event to a company (custom) role, not just
-- the fixed system roles. Legacy assigned_role (app_role enum) is kept for
-- existing events; new assignments use assigned_custom_role_id.
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS assigned_custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS calendar_events_custom_role_idx
  ON public.calendar_events(tenant_id, assigned_custom_role_id);
