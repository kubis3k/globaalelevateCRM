---
tags: [prehled, moc]
updated: 2026-09-05
---

# 🏢 Přehled projektu

**globaalelevateCRM** (interní název v `package.json`: `temp-app`) je **modulární monolit** — interní CRM/ERP pro českou event/produkční firmu Globaal Elevate. UI i komentáře jsou česky.

## Tři tváře jedné aplikace (3 domény)
Jedna Next.js app obsluhuje tři domény (viz [[Deploy a prostředí]]):
- **`work.globaalelevate.com`** — interní dashboard (30 modulů: finance, HR, akce, CRM, projekty…).
- **`klient.globaalelevate.com`** — [[Klientský portál]] pro externí klienty (role `external`).
- **`jobs.globaalelevate.com`** — veřejný náborový web (kariéra, přihlášky).

## Klíčové vlastnosti
- **Multi-tenant** — každá doménová tabulka nese `tenant_id`. Izolace v aplikačním kódu (RLS neutralizované). Viz [[Databáze a multi-tenant]].
- **Účto** je autoritativní zdroj financí (read-only). Viz [[Účto integrace]].
- **Better-Auth** místo Supabase Auth (po cutoveru). Role admin/manager/employee/external. Viz [[Autentizace a role]].
- **Neon Postgres + Drizzle**, ale ~675 starých volání jede přes **pg-shim** (emulace supabase-js). Viz [[Databáze a multi-tenant]].

## Dokumentace v repu
- `docs/adr/` — ADR 0001 (modulární monolit), 0002 (Neon migrace + audit), 0003 (oddělení mail klíče).
- `docs/DOKUMENTACE.md` — projektová dokumentace.
- `AGENTS.md` — ⚠️ „This is NOT the Next.js you know" (Next 16 breaking changes; číst `node_modules/next/dist/docs/`).
- `.claude/` — [[Flow systém]] (orchestrace agentů) + `state/flow-state.md` (checkpoint).
- **Tento vault** — lidsky čitelná znalostní báze.

Rozcestník: [[00 Index]]
