-- =========================================================================
-- !!! NEAPLIKOVAT V PR2a !!!
--
-- LEADY — FK crm_prospects.region → cz_regions(code).
--
-- Tato migrace se smí spustit TEPRVE POTÉ, co jsou hotové VŠECHNY tři věci:
--   1) formulář prospekta (src/app/(dashboard)/prospects/prospects-client.tsx,
--      dnes volný <Input name="region" placeholder="Praha"> s labelem
--      „Region / město") je přepnutý na <select> s kódy krajů z cz_regions,
--   2) import (src/app/api/prospects/import/route.ts) mapuje název kraje/města
--      na kód a neznámou hodnotu odmítne s читelnou chybou, ne FK violation,
--   3) existující hodnoty v crm_prospects.region jsou namapované na kódy
--      (dnes je tabulka prázdná, ale to se do PR2b změní).
--
-- Kdyby se spustila dřív, první uložení prospekta s regionem „Praha“ spadne na
-- FK violation a uživatel dostane raw DB chybu. Číselník cz_regions samotný
-- zakládá už migrace 20240645 — tady se přidává jen ta integritní vazba.
--
-- Kontrola před spuštěním (musí vrátit 0 řádků):
--   SELECT DISTINCT region FROM crm_prospects
--   WHERE region IS NOT NULL
--     AND region NOT IN (SELECT code FROM cz_regions);
--
-- Idempotentní.
-- DOWN: down/20240653000000_prospect_region_fk.sql
-- =========================================================================

ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_region_fkey;
ALTER TABLE public.crm_prospects
  ADD CONSTRAINT crm_prospects_region_fkey
  FOREIGN KEY (region) REFERENCES public.cz_regions(code)
  DEFERRABLE INITIALLY DEFERRED;
