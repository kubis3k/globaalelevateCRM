-- Příloha souboru u obchodní smlouvy → odkaz na dokument v knihovně (Dokumenty).
ALTER TABLE public.business_contracts ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;
