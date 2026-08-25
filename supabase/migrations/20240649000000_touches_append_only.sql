-- =========================================================================
-- LEADY (PR2a) — crm_prospect_touches jako append-only audit doteků.
-- Log komunikace s leadem je doklad o tom, co a kdy jsme dělali → nesmí být
-- přepisován ani mazán "po sobě". Oprava chybného zápisu se dělá novým
-- doteknutím, ne editací starého.
--
-- POZOR (1): tato ochrana je účinná proti CHYBĚ V APLIKACI, NE proti ownerovi
-- DB — neondb_owner (kterým se aplikace připojuje) může trigger vypnout nebo
-- dropnout. Uživatel to vědomě přijal; jde o pojistku, ne o hard security.
--
-- POZOR (2): DELETE prospektu (crm_prospects) CASCADE maže i jeho doteky.
-- Trigger to vědomě povolí (viz níže) — GDPR výmaz subjektu musí být možný,
-- a bez toho by prospekt nešel smazat vůbec. Je to vědomý ústupek: smazání
-- prospektu legálně maže i celou jeho historii doteků.
--
-- Idempotentní.
-- DOWN: down/20240649000000_touches_append_only.sql
-- =========================================================================

-- Logika shodná s crm_prospect_origin:
--   * UPDATE  → vždy zakázán,
--   * DELETE  → povolen jen když už neexistuje rodičovský prospekt (probíhá
--               RI cascade z DELETE FROM crm_prospects; cascade se spouští
--               teprve po smazání rodiče, takže lookup nic nenajde),
--               nebo když už neexistuje tenant (cascade z DELETE FROM tenants,
--               kde pořadí RI triggerů mezi prospects/touches není garantované).
CREATE OR REPLACE FUNCTION public.fn_touches_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospects p WHERE p.id = OLD.prospect_id)
       OR NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = OLD.tenant_id)
    THEN
      RETURN OLD; -- cascade od crm_prospects / tenants
    END IF;
  END IF;
  RAISE EXCEPTION 'crm_prospect_touches je append-only (%).', TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_touches_append_only ON public.crm_prospect_touches;
CREATE TRIGGER trg_touches_append_only
  BEFORE UPDATE OR DELETE ON public.crm_prospect_touches
  FOR EACH ROW EXECUTE FUNCTION public.fn_touches_append_only();

REVOKE UPDATE, DELETE ON public.crm_prospect_touches FROM PUBLIC;
