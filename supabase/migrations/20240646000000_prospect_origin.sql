-- =========================================================================
-- LEADY (PR2a) — crm_prospect_origin: právní evidence původu leadu
-- (odkud jsme kontakt získali, kdy, kdo, na jakém právním základě).
-- Povinný doklad pro GDPR / oprávněný zájem u cold outreach.
--
-- POZOR: tato migrace zakládá POUZE tabulku, BEZ vynucení existence záznamu.
-- Enforcement (constraint trigger, který odmítne prospekt bez origin řádku)
-- přichází až migrací 20240652000000_prospect_origin_enforce.sql a smí být
-- aplikován TEPRVE PO úpravě aplikačního kódu (prospects/actions.ts + import
-- route), jinak okamžitě rozbije existující zápisovou cestu pro prospekty.
--
-- Idempotentní.
-- DOWN: down/20240646000000_prospect_origin.sql
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.crm_prospect_origin (
  prospect_id UUID PRIMARY KEY REFERENCES public.crm_prospects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL CHECK (source_url ~ '^https?://'),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acquired_by UUID NOT NULL REFERENCES public.users(id),
  legal_basis TEXT NOT NULL
    CHECK (legal_basis IN ('opravneny_zajem','souhlas','smluvni_vztah')),
  is_legal_entity BOOLEAN NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_prospect_origin_tenant
  ON public.crm_prospect_origin(tenant_id);

-- ── Append-only ochrana proti ztrátě právní evidence ────────────────────
-- Origin nesmí být smazán, dokud existuje prospekt, ke kterému patří.
-- Smazání smí projít JEN jako součást CASCADE:
--   a) DELETE FROM crm_prospects  → RI cascade maže origin AŽ POTÉ, co je
--      rodičovský řádek smazán, takže lookup do crm_prospects už nic nenajde;
--   b) DELETE FROM tenants        → cascade může sáhnout na origin JEŠTĚ PŘED
--      crm_prospects (pořadí RI triggerů není garantované), proto povolujeme
--      delete i tehdy, když už neexistuje tenant.
-- Ochrana je účinná proti chybě v aplikaci, NE proti ownerovi DB.
CREATE OR REPLACE FUNCTION public.fn_prospect_origin_no_delete()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.crm_prospects p WHERE p.id = OLD.prospect_id)
     AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = OLD.tenant_id)
  THEN
    RAISE EXCEPTION
      'crm_prospect_origin je právní evidence — nelze smazat, dokud existuje prospekt %.',
      OLD.prospect_id;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_prospect_origin_no_delete ON public.crm_prospect_origin;
CREATE TRIGGER trg_prospect_origin_no_delete
  BEFORE DELETE ON public.crm_prospect_origin
  FOR EACH ROW EXECUTE FUNCTION public.fn_prospect_origin_no_delete();
