-- =========================================================================
-- LEADY (PR2a) — crm_do_not_call: seznam čísel, která se NESMÍ volat/kontaktovat.
-- Append-only evidence (zápis = žádost o nekontaktování; nikdy se needituje ani
-- nemaže, jinak bychom ztratili doklad, že jsme žádost obdrželi).
-- Idempotentní.
-- DOWN: down/20240647000000_do_not_call.sql
-- POZOR: ochrana je účinná proti chybě v aplikaci, NE proti ownerovi DB
-- (neondb_owner může trigger vypnout) — vědomě akceptováno.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.crm_do_not_call (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  reason TEXT,
  requested_via TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (tenant_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS idx_do_not_call_tenant
  ON public.crm_do_not_call(tenant_id, phone_e164);

-- ── Append-only ────────────────────────────────────────────────────────
-- UPDATE je zakázán vždy. DELETE je zakázán, dokud existuje tenant — smazání
-- smí projít jen jako součást CASCADE při rušení tenantu (viz stejná logika
-- u crm_prospect_origin a crm_prospect_touches).
CREATE OR REPLACE FUNCTION public.fn_do_not_call_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = OLD.tenant_id) THEN
      RETURN OLD; -- cascade od tenants
    END IF;
  END IF;
  RAISE EXCEPTION 'crm_do_not_call je append-only (%).', TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_do_not_call_append_only ON public.crm_do_not_call;
CREATE TRIGGER trg_do_not_call_append_only
  BEFORE UPDATE OR DELETE ON public.crm_do_not_call
  FOR EACH ROW EXECUTE FUNCTION public.fn_do_not_call_append_only();

REVOKE UPDATE, DELETE ON public.crm_do_not_call FROM PUBLIC;

-- ── Vynucení blocklistu na prospektech ──────────────────────────────────
-- Zadání vyžaduje kontrolu "při importu i před každým vytočením" (aplikační
-- vrstva), tohle je obrana do hloubky na úrovni DB: když telefon prospekta
-- odpovídá záznamu v crm_do_not_call téhož tenanta, vynutí se status
-- 'do_not_call'. INSERT se ZÁMĚRNĚ neblokuje — lead musí zůstat evidovaný,
-- jinak bychom pro kontrolu ČTÚ neměli doklad, že jsme žádost respektovali.
--
-- POZOR na normalizaci: crm_prospects.phone NENÍ garantovaně E.164 (existující
-- formulář je volný text), zatímco crm_do_not_call.phone_e164 ano. Proto se
-- porovnává po odstranění mezer, pomlček, teček a závorek. Spolehlivé je to
-- jen pro vstup v E.164 (typicky z importu); pro ručně psaná čísla bez
-- předvolby je autoritativní kontrola v aplikaci.
CREATE OR REPLACE FUNCTION public.fn_normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_phone, ''), '[\s\-\.\(\)]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.fn_prospects_enforce_dnc()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.crm_do_not_call d
    WHERE d.tenant_id = NEW.tenant_id
      AND public.fn_normalize_phone(d.phone_e164) = public.fn_normalize_phone(NEW.phone)
  ) THEN
    NEW.status := 'do_not_call';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prospects_enforce_dnc ON public.crm_prospects;
CREATE TRIGGER trg_prospects_enforce_dnc
  BEFORE INSERT OR UPDATE OF phone ON public.crm_prospects
  FOR EACH ROW EXECUTE FUNCTION public.fn_prospects_enforce_dnc();
