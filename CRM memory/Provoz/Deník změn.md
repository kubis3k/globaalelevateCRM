---
tags: [denik, changelog]
updated: 2026-09-05
---

# 📓 Deník změn

Append-only chronologie zásahů. Nejnovější nahoře. Detail vždy i v git historii.

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
