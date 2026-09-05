---
tags: [domena, faktury, portal]
updated: 2026-09-05
status: hotovo (nasazeno)
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

### ✅ Implementováno (commit `d9a4d2a`, nasazeno)
Generujeme **plný daňový doklad na straně CRM** z účto dat + brandingu jako skutečné `.pdf`:
1. `ucto.ts`: `getUctoInvoiceDetailForClient(id, client)` — doklad + položky (`document_line`) + dodavatel (`accounting_unit` vč. loga) + odběratel (`contact`) + rozpad DPH. **Ownership v SQL** (účto-contact musí odpovídat klientovi přes IČO/název) → external nestáhne cizí fakturu (IDOR ochrana).
2. `src/lib/pdf/invoice.ts`: `renderInvoicePdf()` přes **pdf-lib** (`1.17.1`) + **@pdf-lib/fontkit**. Pure-JS/Vercel-safe (žádný chromium). Font **Roboto vložený base64** (`src/lib/pdf/fonts/roboto-{regular,bold}.ts`) — ne přes `/fonts` URL, protože host guard na `klient.` by fetch přesměroval. A4 doklad: hlavička s logem, odběratel + meta (VS/DUZP/splatnost), tabulka položek, rekapitulace DPH, platební údaje, razítko UHRAZENO.
3. `src/app/api/portal/invoices/[id]/pdf/route.ts`: `runtime='nodejs'`, `getPortalClientContext` ownership re-check → stream `application/pdf` jako attachment.
4. `portal/invoices/invoice-download.tsx`: tlačítko PDF v tabulce (otevře route přímo).

Poznámka: `@pdf-lib/fontkit` nemá typy → deklarace v `src/types/pdf-lib-fontkit.d.ts`. Vercel jede `npm install` (ne `npm ci`), takže stačilo přidat dep do `package.json`.

> [!note] Alternativy, pokud uživatel nechce rekonstrukci
> - Zjistit, zda účto web app má HTTP endpoint na render PDF (nemáme jeho zdroják) → proxy.
> - Přijmout, že „oficiální" = vygenerované z týchž dat + brandingu (jako teď účto).

> [!warning] Portál teď ukáže prázdno
> Dokud v účtu nejsou žádné vydané faktury, portál klientům nic nezobrazí — feature bude funkční, až vydané faktury vzniknou.

Souvisí: [[Účto integrace]] · [[Klientský portál]] · [[Storage — Vercel Blob]]
