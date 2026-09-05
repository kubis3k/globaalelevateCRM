---
tags: [domena, faktury, portal]
updated: 2026-09-05
status: rozpracováno
---

# 🧾 Faktury

Modul **Faktury** je read-only zrcadlo účetního systému. Data z [[Účto integrace]], žádná vlastní evidence.

## Kde to je
- Interní: `src/app/(dashboard)/invoices/page.tsx` — `getUctoInvoices()`, vydané + přijaté, odkaz na ucto.globaalelevate.com pro správu.
- Portál: `src/app/(portal)/portal/invoices/page.tsx` — `getUctoInvoicesForClient(client)`, jen **vydané** faktury daného klienta (párování IČO/název).
- Lokální Drizzle `invoices` tabulka existuje, ale je **legacy/nepoužitá** pro zobrazení.

## Zobrazená pole
Číslo, VS, vystaveno, splatnost, stav (uhrazeno/po splatnosti/čeká), částka. + StatCardy Celkem/Uhrazeno/Neuhrazeno.

## 🎯 Úkol: PDF faktury do portálu

### Rozhodnutí uživatele (2026-09-05)
- Obsah: **oficiální PDF z účta** (plný daňový doklad, ne rekonstrukce).
- Technika: **skutečný `.pdf` soubor** (ne HTML tisk).

### Zjištěná realita (introspekce účta) — mění zadání
- Účto **neukládá** vygenerované PDF vydaných faktur (0 vydaných faktur; uložená PDF jsou jen přijaté/interní doklady).
- Neexistuje tedy „oficiální uložený soubor" k proxy.
- **Ale** účto má kompletní data pro plný daňový doklad: `document` (hlavička + `vat_base_amount`/`vat_rate`/`vat_amount`, DUZP) + `document_line` (položky) + `accounting_unit` (dodavatel + logo/razítko/podpis) + `contact` (odběratel + DIČ).

### Doporučená cesta (čeká na potvrzení)
Vygenerovat **plný daňový doklad na straně CRM** z účto dat + účto brandingu → dodá to samé, co by vytisklo účto, jako skutečné `.pdf`:
1. `ucto.ts`: `getUctoInvoiceDetailForClient(id, client)` — doklad + položky + dodavatel + odběratel, se **stejným ownership checkem** (IČO/název) → klient stáhne jen svou fakturu.
2. Knihovna **`@react-pdf/renderer`** (pure JS, Vercel-safe; puppeteer NE — chromium). + bundled font s českou diakritikou (Roboto/DejaVu TTF).
3. Šablona daňového dokladu + route `/api/portal/invoices/[id]/pdf` (ownership re-check → stream `application/pdf`).
4. Download tlačítko v tabulce portálu (mirror `portal/documents/doc-download.tsx`).

> [!note] Alternativy, pokud uživatel nechce rekonstrukci
> - Zjistit, zda účto web app má HTTP endpoint na render PDF (nemáme jeho zdroják) → proxy.
> - Přijmout, že „oficiální" = vygenerované z týchž dat + brandingu (jako teď účto).

> [!warning] Portál teď ukáže prázdno
> Dokud v účtu nejsou žádné vydané faktury, portál klientům nic nezobrazí — feature bude funkční, až vydané faktury vzniknou.

Souvisí: [[Účto integrace]] · [[Klientský portál]] · [[Storage — Vercel Blob]]
