---
tags: [provoz, todo, rizika]
updated: 2026-09-05
---

# ✅ Otevřené úkoly / rizika

## 🔴 Provozní (mimo kód)
- [ ] **Vercel účet v prodlení** („Payment failed / Overdue") — vyřešit fakturu, hrozí vypnutí provozu. Viz [[Deploy a prostředí]].

## 🟠 Bezpečnost / tech dluh
- [ ] **`SUPABASE_SERVICE_ROLE_KEY`** — nastavit `MAIL_ENCRYPTION_KEY`, přešifrovat stará hesla schránek, teprve pak lze service key rotovat/mazat. Viz [[Mail a šifrování]].
- [ ] **Blob prefix** (kosmetika) — store připojen s `blob_` místo `BLOB_`; kód řeší `blobToken()` fallbackem. Volitelně přepojit s defaultním prefixem a zrevokovat starý token. Viz [[Storage — Vercel Blob]].

## 🟡 [[Faktury|PDF faktury]]
- [ ] Ověřit vzhled PDF na reálné vydané faktuře — v účtu je teď **0 vydaných faktur**, feature nemá co zobrazit, dokud nevzniknou.
- [ ] (volitelně) přidat PDF i do interního modulu Faktury (teď jen portál).

## 🟡 [[Reporty]]
- [ ] **Přílohy k reportům** — tabulka `client_report_attachments` je, chybí UI (upload v editoru + stažení v portálu). Uživatel chtěl „obojí" (generovat + přiložit) — generování hotové, přílohy dořešit.
- [ ] Volitelně logo firmy do PDF hlavičky reportu.

## 🟢 [[Leady a Akvizice|Leady]]
- [ ] **PR3** — vitest + čisté funkce `src/lib/leads/*` (další v pořadí).
- [ ] PR4 seznam/detail → PR5 fronta hovorů → PR6 import → PR7 ČTÚ export (HTML print).
- [ ] Aplikovat odložené migrace `20240652` + `20240653` (až formulář/import půjde přes transakce a kódy krajů).
- [ ] `VisionBoost_Sales_Leads.xlsx` — uživatel doošle (pro PR6). Google Places API klíč pro `enrich_places.py`.

Souvisí: [[00 Index]] · [[Deník změn]]
