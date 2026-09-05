---
tags: [domena, crm, klienti]
updated: 2026-09-05
---

# 🤝 CRM — Klienti

Interní správa klientů (modul `crm`). Klienti jsou obecní (marketing/weby/akce), napojení na portál, finance, reporty, události atd.

## Struktura
- `(dashboard)/crm/` — `page.tsx` (přehled), `clients/` (seznam + detail), `pipeline/` (deals), `crm-nav.tsx`, `layout.tsx`.
- `crm/actions.ts` — `createCrmClient`, `updateCrmClient`, `deleteCrmClient`, kontakty (`createContact`/`deleteContact`), aktivity (`createActivity`/`toggleActivity`/`deleteActivity`), deals (`createDeal`/`setDealStage`/`deleteDeal`), **`lookupAres(ico)`** (ARES lookup názvu/DIČ/adresy).
- `clientRow(fd)` čte: name, ico, dic, email, phone, website, address, **ownerId**, status, note. ⚠️ `ownerId` je v edit formu potřeba poslat (jinak se vlastník vynuluje).

## Detail klienta — 360° přehled (`clients/[id]/`)
`page.tsx` načte klienta + související data, `client-detail.tsx` renderuje. Rozšířeno 2026-09-05:
- **Header**: název, stav, badge „Portál napojen/Bez portálu", kontakt (mailto/tel), IČO/DIČ/vlastník, poznámka. Rychlé akce: **Upravit** (edit dialog), **Nový report** (→ /reports/klienti), **Portál** (→ /portal-admin).
- **KPI z účta**: Fakturováno / Uhrazeno / Neuhrazeno (reálné faktury z [[Účto integrace|účta]] přes `getUctoInvoicesForClient`, párování IČO/název) + Obchod (součet deals).
- **Přehled napojení** (dlaždice s počty + odkazy): Reporty (→ /reports/klienti), Události (→ /events), Smlouvy (→ /business-contracts), Nabídky (→ /quotes), Dodávky, Dokumenty (→ /documents).
- **Kontaktní osoby** (+ přidat/smazat).
- **Faktury** z účta (tabulka, stav uhrazení, odkaz na ucto.globaalelevate.com). Nahradily legacy lokální `invoices` tabulku (byla prázdná/nepoužitá).
- **Aktivity + komunikace**: sloučený feed CRM aktivit + zpráv z portálu (`portal_messages`). Aktivita s „Vidí klient" se zobrazí v portálu.
- **Edit dialog**: název/stav/vlastník (select z profiles)/IČO/DIČ/email/telefon/web/adresa/poznámka → `updateCrmClient`.

## Napojení klienta (client_id) napříč DB
`crm_contacts, crm_activities, crm_deals, quotes, deliverables, business_contracts, events, client_reports, documents` — všechny mají `client_id`. Portál: `portal_access.client_id` (viz [[Klientský portál]]).

## TODO / nápady
- Editace/mazání deals přímo z detailu, sekce s posledními událostmi/reporty (teď jen počty + odkaz).
- Předvyplnit klienta při „Nový report" (teď jde na obecný list).

Souvisí: [[Klientský portál]] · [[Účto integrace]] · [[Reporty]] · [[Faktury]]
