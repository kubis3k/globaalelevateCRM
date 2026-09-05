---
tags: [denik, changelog]
updated: 2026-09-05
---

# 📓 Deník změn

Append-only chronologie zásahů. Nejnovější nahoře. Detail vždy i v git historii.

## 2026-09-05 — Fix: odeslání reportu nefungovalo (timestamptz)
- `sendClientReport` nastavoval `sent_at: new Date().toISOString()` (string) → drizzle timestamp hodil `"e.toISOString is not a function"` → celý update spadl, status zůstal `draft`. Save fungoval (jen textové sloupce).
- Diagnostika: dočasný debug endpoint izoloval — `{status}` OK, `{sent_at: iso string}` chyba, `{sent_at: new Date()}` OK.
- Fix: `sent_at: new Date()`. Viz gotcha v [[Databáze a multi-tenant]] (latentní bug i jinde v repu).

## 2026-09-05 — CRM detail klienta: 360° přehled
- Rozšířen `crm/clients/[id]` na plný přehled. Viz [[CRM klienti]].
- Reálné **faktury z účta** (nahradily prázdnou legacy tabulku) + KPI (fakturováno/uhrazeno/neuhrazeno/deals).
- Dlaždice s počty a odkazy: reporty, události, smlouvy, nabídky, dodávky, dokumenty. Badge portál napojen.
- **Editace klienta** (dialog, `updateCrmClient` — vlastník ze select profiles). Rychlé akce v headeru.

## 2026-09-05 — Klientské reporty (posílání + PDF do portálu)
- Nová feature: interní tým vytvoří report (název/období/shrnutí + metriky + sekce), odešle klientovi, klient si ho v [[Klientský portál|portálu]] stáhne jako PDF. Viz [[Reporty]].
- Migrace `20240654_client_reports.sql` (4 tabulky) aplikována na Neon main + Drizzle schema.
- Interní: `/reports/klienti` (list + editor), portál: nav „Reporty" + `/portal/reports`. PDF přes pdf-lib (`lib/pdf/report.ts`), routy interní náhled + portál (ownership + jen `sent`).
- Portál header: přidán zvonek (oznámení/push) + ozubené kolo (změna hesla) — `PortalHeaderActions`.
- Kontext: portál je obecný (marketing/weby/akce), ne jen eventy.
- TODO: přílohy k reportům (tabulka je, UI ne).

## 2026-09-05 — Dashboard header: ikony oznámení + nastavení
- `app-shell.tsx`: vedle uživatele přidány samostatné ikony **zvonek** (Oznámení → `setShowPush`, PushSetupDialog) a **ozubené kolo** (Nastavení → link `/settings`, jen když `allowedModules` obsahuje `settings`).
- Odebrána duplicitní položka „Notifikace" z user dropdownu (zvonek ji nahrazuje). Podle screenshotu (bell + gear + user).

## 2026-09-05 — Fix loga v portálu (velký box přes navigaci)
- `public/logo.png` byl **2000×2000 čtverec s bílým pozadím** (wordmark 5.3:1 utopený v bílém okraji), RGB bez alfy.
- Bug: Tailwind preflight `img{height:auto}` přebil `height={36}` → při `width:120px` a čtvercovém zdroji výška vyskočila na 120px → velký čtverec přetékal do nav („Přehled"). Bílé pozadí + `.logo-smart` `mix-blend-mode:multiply` navíc dělalo barevný box.
- Fix: `public/logo.png` ořezán na obsah + převeden na **RGBA průhledný** wordmark (1206×226, ink #111827). Záloha originálu `/private/tmp/logo-original-backup.png` (i v git historii).
- `(portal)/layout.tsx`: logo `h-8 w-auto object-contain` (pevná výška 32px). Ostatní místa (login/invite/app-shell/sidebar) opravou assetu taky přestala dělat obří čtverec.

## 2026-09-05 — Demo data pro klientský portál
- Vytvořena testovací data pro portál (účet `test@test.com`). Viz [[Demo data (portál)]].
- Klient „Demo Klient s.r.o." (IČO 12345678) + napojení portálu + 3 dodávky, 2 smlouvy, 1 událost, 1 zpráva.
- Účto: 2 vydané faktury DEMO-2026-001 (neuhrazená) / -002 (uhrazená) → test PDF faktur.
- ⚠️ Označeno DEMO, úklidové SQL v [[Demo data (portál)]].

## 2026-09-05 — PDF vydané faktury do portálu (DONE)
- Klient v portálu si stáhne plný daňový doklad jako `.pdf`. Viz [[Faktury]].
- Účto neukládá PDF vydaných faktur → generujeme z účto dat (`document`+`document_line`+`accounting_unit`+`contact`) přes **pdf-lib** + fontkit (font Roboto base64). Ownership v SQL (IČO/název) → IDOR ochrana.
- Route `/api/portal/invoices/[id]/pdf` (nodejs), tlačítko v tabulce. Commit `d9a4d2a` (build READY).
- ⚠️ V účtu je teď **0 vydaných faktur** → portál nic nezobrazí, dokud nevzniknou. Zjištěno introspekcí účto DB (`purple-star-75414719`).

## 2026-09-05 — Storage migrace Supabase → Vercel Blob (DONE)
- Dokončena celá migrace úložiště souborů. Viz [[Storage — Vercel Blob]].
- **Příčina zdržení:** store připojen s prefixem `blob_` místo `BLOB_` → SDK nenašlo token. Fix `blobToken()` (commit `314b0b7`).
- Zkopírováno 20/20 souborů (`ok:20`). Dočasný `/api/admin/migrate-storage` po ověření smazán (commit `5d05a21`).
- Bezpečnost: interní download routes odmítají roli `external` (security-guardian APPROVE).
- Commity: `601a1b2` (migrace, build ERROR) → `4508d9c` (Buffer fix) → `e334bc4` (redeploy) → `314b0b7` (token fix) → `5d05a21` (cleanup).

## 2026-09-05 — Klientský portál: bezpečnost + UX
- **Host guard** v `middleware.ts`: na `klient.` doméně smí external jen `/portal` + auth cesty; cokoli interního → redirect `/portal`. Commit `bfb2200`.
- Smazán mrtvý `/api/admin/seed-passwords` (vracel hardcoded heslo).
- Portál prázdné stavy: rozlišení „účet nepropojen" vs „nic tu není" (Smlouvy/Dodávky/Dokumenty). Commit `2d7dcde`.

## 2026-09-05 — Flow systém v2
- Upgrade `.claude/` na flow-system-v2, přizpůsobeno globaalCRM (viz [[Flow systém]]).
- Noví agenti: `security-guardian` (opus), `ux-reviewer` (sonnet). Commit `9af4521`.

## Dřívější (detail v git historii)
- **Leady PR2a+PR2b** — rozšíření Akvizice o ČTÚ evidenci, do-not-call, scoring. Viz [[Leady a Akvizice]].
- **Supabase → Neon + Drizzle + Better-Auth cutover** — 3 login bugy opraveny (account_id, Drizzle relations, better-auth `issuer`, pin na 1.7.1). `trustedOrigins` pro 3 domény.
- **Akce/events bug** — pg-shim `order()` nesměl volat `.nullsFirst()/.nullsLast()` (nestabilní napříč drizzle verzemi) → přepsáno na raw sql. Viz [[Databáze a multi-tenant]].
