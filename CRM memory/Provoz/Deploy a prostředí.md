---
tags: [provoz, deploy, env]
updated: 2026-09-05
---

# 🚀 Deploy a prostředí

## Vercel
- Projekt **`globaalelevate`** (`prj_B7GrHvDOAS4TJMlRM22IYe9C7mcg`, team `team_1yESzoVMSp6Efw30sZADGlxr`), účet lapone277-3095 / jakub@lucanovi.com.
- Repo: GitHub `kubis3k/globaalelevateCRM`, branch **main** → auto-deploy Production.
- **Deploy workflow: push na `main` → Vercel build.** Build je jediná TS kontrola (nemáme lokální Node). `npm install` (ne `npm ci`) — stačí editovat `package.json`.
- Bundler: **Turbopack**.

> [!warning] Účet je v prodlení
> Vercel účet hlásí **„Payment failed / Overdue"** — hrozí vypnutí. Vyřešit fakturu, jinak spadne provoz bez ohledu na kód.

## Tři domény (jedna app) — `src/middleware.ts`
- **`work.globaalelevate.com`** — interní dashboard (default host). `/` → `/dashboard`.
- **`jobs.globaalelevate.com`** — náborový web. Middleware rewrite `jobs.*/<path>` → `/jobs/<path>`.
- **`klient.globaalelevate.com`** — [[Klientský portál]]. Host guard: jen `/portal`+auth cesty, zbytek → `/portal`.
- Middleware: skip `_next`/static; `/api` průchozí (Bearer tokeny / pg_cron); cookie-only session check (edge, `getSessionCookie`) → nepřihlášené na `/login`. Autoritativní ověření až v Node (`requireTenant`).

## Env proměnné (názvy, hodnoty jen ve Vercelu)
`DATABASE_URL` (Neon) · `UCTO_DATABASE_URL` ([[Účto integrace|účto]] Neon `purple-star-75414719`) · `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` · `BLOB_READ_WRITE_TOKEN` (+ lowercase `blob_READ_WRITE_TOKEN`, viz [[Storage — Vercel Blob]]) · `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nemazat — [[Mail a šifrování]]) · `MAIL_ENCRYPTION_KEY` · `ANTHROPIC_API_KEY` · `CRON_SECRET` · `PROSPECTS_IMPORT_SECRET` · `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` · `VERCEL_URL`, `NODE_ENV`.

## Databáze (Neon, org jakub@lucanovi.com)
- `restless-sound-29076324` — **globaalelevate-crm** (hlavní).
- `purple-star-75414719` — **ucto** (účetní systém, read-only).
- Další projekty v org: bilanxflow-product, GateUP Production, rezerv./rezervace, VB.

## Cron
Supabase pg_cron (pg_net) → `POST /api/cron` Bearer `CRON_SECRET` (mail polling + upomínky).

## Nástroje pro tuto session
- Vercel MCP (`list_deployments`, `get_deployment_build_logs`) — nečte env vars.
- Neon MCP (`run_sql`, `project_id`) — introspekce/dotazy.

Souvisí: [[Architektura]] · [[Storage — Vercel Blob]] · [[Účto integrace]] · [[Mail a šifrování]]
