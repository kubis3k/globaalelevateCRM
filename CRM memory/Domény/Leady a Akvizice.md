---
tags: [domena, leady, crm]
updated: 2026-09-05
---

# 📞 Leady a Akvizice

Modul **Obchod → Akvizice** — rozšíření existujícího `/prospects` (NE nová tabulka) o leady, ČTÚ evidenci, do-not-call, scoring. Zadání: `Downloads/PROMPT_leady_globaalelevateCRM.md`.

## Kde to je
- `src/app/(dashboard)/prospects/actions.ts` — prospekty.
- `src/app/(dashboard)/crm/actions.ts` — CRM (klienti/dealy), **ARES** lookup IČO.
- `src/lib/leads/guard.ts` — `resolveLeadsCtx()`: blokuje roli `external` i klient./jobs. host, vrací scope `all`|`own` (bez redirect side-efektu → jde použít v action i API route) + `canTouchLead()`.

## Datový model (migrace PR2a, aplikováno na produkci)
Rozšiřuje `crm_prospects` + `crm_prospect_touches` + nové tabulky:
- `cz_regions` (14 krajů) + `crm_industries` (per-tenant číselník, seed + AFTER INSERT trigger).
- `crm_prospect_origin` — právní evidence původu (source_url, legal_basis, acquired_by), append-only.
- `crm_do_not_call` — E.164 blocklist, append-only + REVOKE + enforcement trigger (shoda čísla → status `do_not_call`).
- touches: `status_before/after`, `duration_s`, `next_touch_set_at`; append-only trigger.
- `crm_scoring_config` (weights/thresholds/cadence jsonb) + `fn_prospect_score` (absolutní 0–100, per-source prahy).

## Bezpečnost (PR2b)
Scout našel díru: portálový `external` se dostal na CRM/Obchod server actions (skrytí v navigaci není ochrana). Zavřeno: `getAllowedModules` external→[], `leads.manage`/`leads.viewAll` perms, jednotný guard, row-level ownership (`owner=me OR owner IS NULL`).

## PR mapa
PR1 report → PR2a migrace → PR2b bezpečnost+schema → **PR3 vitest+čisté funkce** (další) → PR4 seznam/detail → PR5 fronta hovorů → PR6 import → PR7 ČTÚ export (HTML print, ne PDF lib).

## Stav / TODO
- PR2a+PR2b HOTOVO a nasazeno. Další: PR3.
- ⚠️ ZÁMĚRNĚ NEAPLIKOVÁNO: `20240652_prospect_origin_enforce.sql` (deferred trigger — rozbil by zápis, dokud nejde přes `db.transaction()`) a `20240653_prospect_region_fk.sql` (FK region — dokud formulář/import nepřejde na kódy krajů).
- Data: `Downloads/leady_ARES_CR.xlsx` (383 firem STC/ULK, bez telefonů). `enrich_places.py` čeká na Google Places API klíč. `VisionBoost_Sales_Leads.xlsx` uživatel doošle (pro PR6).

Souvisí: [[Databáze a multi-tenant]] · [[Autentizace a role]] · [[Otevřené úkoly]]
