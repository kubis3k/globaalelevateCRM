-- =========================================================================
-- Shift workflow: pending-confirm, decline-with-reason (HR-approved),
-- worked confirmation (employee reports → manager verifies).
-- Idempotentní.
-- =========================================================================

-- Nový stav: zaměstnanec požádal o odmítnutí směny (čeká na schválení HR).
ALTER TYPE public.hr_assignment_status ADD VALUE IF NOT EXISTS 'decline_requested';

ALTER TABLE public.hr_shift_assignments ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE public.hr_shift_assignments ADD COLUMN IF NOT EXISTS worked_status TEXT NOT NULL DEFAULT 'none'; -- none | reported | verified
ALTER TABLE public.hr_shift_assignments ADD COLUMN IF NOT EXISTS worked_reported_at TIMESTAMPTZ;
ALTER TABLE public.hr_shift_assignments ADD COLUMN IF NOT EXISTS worked_verified_at TIMESTAMPTZ;
ALTER TABLE public.hr_shift_assignments ADD COLUMN IF NOT EXISTS worked_verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.hr_shift_assignments ADD COLUMN IF NOT EXISTS worked_note TEXT;
