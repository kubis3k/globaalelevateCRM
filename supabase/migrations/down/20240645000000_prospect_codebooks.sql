-- =========================================================================
-- DOWN pro 20240645000000_prospect_codebooks.sql
-- DESTRUKTIVNÍ VŮČI DATŮM: dropuje sloupce crm_prospects (industry, city,
-- web_status, rating, review_count, last_touch_at, priority, score_raw) a celé
-- číselníky cz_regions / crm_industries. Data v nich se nevratně ztratí.
-- Idempotentní.
-- POZOR: pořadí — nejdřív FK, pak sloupce, pak číselníky.
-- Pokud je aplikovaná 20240650 (scoring), spusť nejdřív její down migraci,
-- jinak DROP COLUMN selže/zneplatní trigger fn_prospects_apply_score.
-- =========================================================================

ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_industry_fkey;
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_region_fkey;

ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_web_status_check;
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_rating_check;
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_review_count_check;
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_priority_check;

-- Obnovení PŮVODNÍHO znění constraintů (stav před PR2a).
-- POZOR — ZTRÁTA INFORMACE: zúžení CHECKu by spadlo na existujících řádcích
-- (`check constraint ... is violated by some row`), takže je nejdřív musíme
-- přemapovat na hodnoty z původního číselníku. Tím se NEVRATNĚ ztrácí, že lead
-- přišel z OpenStreetMap / firemního webu. Před rollbackem si to vyexportuj:
--   SELECT id, name, source FROM crm_prospects WHERE source IN ('osm','web_firmy');
UPDATE public.crm_prospects SET source = 'jine' WHERE source IN ('osm','web_firmy');
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_source_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_source_check
  CHECK (source IN ('maps','firmy','rejstrik','referral','ig','osobni','jine'));

-- POZOR — ZTRÁTA PRÁVNĚ RELEVANTNÍ INFORMACE: status 'do_not_call' v původním
-- číselníku neexistuje, takže se přemapuje na 'dead'. Tím zmizí příznak, že
-- daný člověk zakázal kontaktování! Záznam v crm_do_not_call zůstává (pokud
-- neběžela i down/20240647), ale tenhle rollback si NEJDŘÍV vyexportuj:
--   SELECT id, name, phone FROM crm_prospects WHERE status = 'do_not_call';
UPDATE public.crm_prospects SET status = 'dead' WHERE status = 'do_not_call';
ALTER TABLE public.crm_prospects DROP CONSTRAINT IF EXISTS crm_prospects_status_check;
ALTER TABLE public.crm_prospects ADD CONSTRAINT crm_prospects_status_check
  CHECK (status IN ('new','contacted','replied','qualified','converted','dead','nurture'));

ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS industry;
ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS city;
ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS web_status;
ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS rating;
ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS review_count;
ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS last_touch_at;
ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS priority;
ALTER TABLE public.crm_prospects DROP COLUMN IF EXISTS score_raw;

DROP TABLE IF EXISTS public.crm_industries;
DROP TABLE IF EXISTS public.cz_regions;
