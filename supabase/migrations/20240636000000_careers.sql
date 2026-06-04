-- =========================================================================
-- CAREERS — veřejná kariérní stránka (jobs.globaalelevate.com).
-- Rozšíření HR náboru o veřejná pole + příjem přihlášek (vč. CV) z webu,
-- přepínač zveřejnění v nastavení firmy, privátní bucket na CV. Idempotentní.
-- =========================================================================

ALTER TABLE public.hr_job_postings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.hr_job_postings ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE public.hr_job_postings ADD COLUMN IF NOT EXISTS salary_range TEXT;
ALTER TABLE public.hr_job_postings ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.hr_candidates ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.hr_candidates ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE public.hr_candidates ADD COLUMN IF NOT EXISTS cv_path TEXT;

ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS jobs_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS careers_intro TEXT;

-- Privátní úložiště pro CV uchazečů (čteno přes service-role, signed URL).
INSERT INTO storage.buckets (id, name, public) VALUES ('applications', 'applications', false) ON CONFLICT (id) DO NOTHING;
