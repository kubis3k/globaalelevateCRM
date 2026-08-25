-- =========================================================================
-- !!! NEAPLIKOVAT V PR2a !!!
-- =========================================================================
-- TATO MIGRACE SE V PR2a **NEAPLIKUJE**.
-- Aplikovat ji lze TEPRVE POTÉ, co je upravený aplikační kód tak, že každý
-- vznikající prospekt v téže transakci zapíše i řádek do crm_prospect_origin:
--   * app/.../prospects/actions.ts  (ruční vytvoření prospektu)
--   * import route pro dávkový import / scrape
-- Bez těchto úprav migrace OKAMŽITĚ ROZBIJE vytváření prospektů — každý INSERT
-- do crm_prospects skončí výjimkou při commitu.
--
-- Co dělá: vynucuje, že ke každému prospektu existuje právní evidence původu.
-- Trigger je CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED, takže se
-- vyhodnocuje až na konci transakce — pořadí INSERTů (prospect → origin)
-- uvnitř transakce tedy nehraje roli.
--
-- Idempotentní.
-- DOWN: down/20240652000000_prospect_origin_enforce.sql
-- POZOR NA TRANSAKCE: deferred constraint trigger vyžaduje, aby INSERT do
-- crm_prospects a INSERT do crm_prospect_origin proběhly v JEDNÉ transakci.
-- Přes pg-shim (src/lib/db/pg-shim.ts) to NEJDE — shim transakce neumí a
-- PostgREST vzorec = každé volání vlastní transakce. Nový kód leadů proto jde
-- na nativní Drizzle `db.transaction()` (src/lib/db/index.ts), viz plán PR2b.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_require_origin()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.crm_prospect_origin o WHERE o.prospect_id = NEW.id
  ) THEN
    RAISE EXCEPTION
      'Prospekt % nemá záznam v crm_prospect_origin — původ leadu je povinná právní evidence.',
      NEW.id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_prospect_requires_origin ON public.crm_prospects;
CREATE CONSTRAINT TRIGGER trg_prospect_requires_origin
  AFTER INSERT ON public.crm_prospects
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.fn_require_origin();
