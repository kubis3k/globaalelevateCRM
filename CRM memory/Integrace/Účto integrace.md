---
tags: [integrace, finance, ucto]
updated: 2026-09-05
---

# 💰 Účto integrace

Účetní systém **ucto.globaalelevate.com** je **autoritativní zdroj financí**. CRM z něj jen **čte souhrny a faktury** (read-only). CRM si vlastní evidenci faktur už nevede.

## Připojení
- Adaptér: [`src/lib/ucto.ts`](../globaalelevateCRM/src/lib/ucto.ts) — přímé připojení na Postgres účta přes `pg.Pool`.
- Env: **`UCTO_DATABASE_URL`** (bez ní vrací `{ connected: false }` a UI to řekne).
- Neon projekt účta: **`purple-star-75414719`** (name „ucto", region us-east-1, pg18), org `org-withered-feather-94052343` (jakub@lucanovi.com).
- Pool přežívá mezi requesty (`globalThis.__uctoPool`), `max: 3`, SSL `rejectUnauthorized:false`.
- Krátká cache 5 min (`CACHE_MS`) pro summary i faktury.

> [!warning] Zvláštnost schématu
> Nasazená verze účta má tabulky ve schématu `public` a používá **SQLite-styl typů**: datumy jako ISO **text**, booleany jako **0/1** (integer). Dotazy tomu odpovídají (ISO text jde porovnávat lexikálně).

## Klíčové funkce v `ucto.ts`
- `getUctoSummary()` → KPI dashboard: tržby/náklady YTD, pohledávky/závazky, bankovní zůstatek, DPH k odvodu (plátce), obrat 12 m vůči limitu 2 mil.
- `getUctoInvoices(limit=300)` → zrcadlo pro interní modul Faktury (vydané + přijaté).
- `getUctoInvoicesForClient({name, ico})` → **vydané** faktury pro klienta portálu. Párování na `contact` podle **přesného IČO**, jinak case-insensitive **názvu firmy**. Bez shody → `[]` (ne `null`; `null` = účto nedostupné).
- Uhrazenost = spárovaná bankovní platba (`bank_statement_line.matched_document_id`) NEBO zaplacená online platba (`invoice_payment.status='paid'`).

## Schéma účta (ověřeno introspekcí 2026-09-05)

### `document` — hlavička dokladu
`id, accounting_unit_id, doc_type, doc_number, variable_symbol, contact_id, project_id, period_id, issue_date, taxable_supply_date` (DUZP)`, due_date, description, total_amount, currency, is_vat_document, vat_base_amount, vat_rate, vat_amount, counterparty_dic, status, responsible_user_id, approved_by/at, cash_payee_*, attachment_path, created_at, updated_at, fx_rate, fx_rate_unit`
- `doc_type`: `faktura_vydana`, `faktura_prijata`, `pokladni_prijem`, `pokladni_vydej`, `interni_doklad`
- `status`: mj. `stornovany` (filtruje se ven)

### `document_line` — položky dokladu
`id, document_id, line_no, description, quantity, unit_price, vat_rate, line_amount, suggested_account_id`

### `vat_ledger_entry` — kniha DPH
`id, document_id, direction` (`uskutecnene`/`prijate`)`, vat_base, vat_rate, vat_amount, counterparty_dic, duzp, requires_individual_kh`

### `accounting_unit` — dodavatel (naše firma)
`id, name, ico, dic, is_vat_payer, iban, bank_account, address, email, phone, logo_data_url, stamp_data_url, signature_data_url, ufo_code, fs_street/house_number/orientation_number/city/zip`
→ obsahuje i **branding assety** (logo/razítko/podpis jako data-url).

### `contact` — odběratel/protistrana
`id, accounting_unit_id, name, contact_type, ico, dic, is_vat_payer, address, bank_account, iban, email`

### `document_attachment` — přílohy
`id, document_id, file_name, file_data (bytea), file_path, mime_type, size_bytes, storage_backend, storage_url, uploaded_at`

## ⚠️ Stav dat (2026-09-05) — důležité pro [[Faktury]]
- **0 vydaných faktur** (`faktura_vydana`) v účtu → portál klientům teď nemá co ukázat.
- Uložené přílohy: **24 přijatých faktur** (21 PDF) + **10 interních dokladů** (10 PDF). Jsou to naskenované doklady od dodavatelů, **ne** vydané faktury.
- Účto **neukládá** vygenerované PDF vydaných faktur → generuje je za běhu (má logo/razítko/podpis).
- **Ale** `document` + `document_line` + `accounting_unit` + `contact` mají kompletní data pro **plný daňový doklad** (položky, rozpad DPH, DUZP, dodavatel vč. brandingu, odběratel vč. DIČ).

Viz rozhodnutí o PDF v [[Faktury]].

Souvisí: [[Databáze a multi-tenant]] · [[Klientský portál]] · [[Deploy a prostředí]]
