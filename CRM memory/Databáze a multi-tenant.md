---
tags: [databaze, architektura, bezpecnost]
updated: 2026-09-05
---

# 🗄️ Databáze a multi-tenant

**Neon Postgres** (projekt `restless-sound-29076324` „globaalelevate-crm", pg18, org jakub@lucanovi.com), **Drizzle ORM**. Migrováno ze Supabase (ADR 0002).

## Připojení — `src/lib/db/index.ts`
- `pg.Pool` (connectionString `DATABASE_URL`, `ssl.rejectUnauthorized:false`, `max:5`), cachovaný na `globalThis.__dbPool` (serverless singleton — nevyčerpat Neon limit spojení na HMR/cold startech).
- Obalený Drizzlem (`drizzle-orm/node-postgres`). Exportuje `db` a `schema`.

## pg-shim — `src/lib/db/pg-shim.ts` ⚠️
PostgREST-kompatibilní query builder, aby **~675 starých volání `supabase.from(table)…` fungovalo beze změny** proti Neon/Drizzle.
- `from(tableName)` → `Query` s `.select/.insert/.update/.upsert/.delete`, filtry (`eq/neq/gt/…/in/is/or`), `.order/.limit/.single/.maybeSingle`, vrací `{ data, error, count }` jako supabase-js.
- Mapuje snake_case názvy tabulek na camelCase klíče schématu (`toCamel`).
- **Nový kód (např. leady) jde na nativní Drizzle**, NE přes shim (ten neumí transakce).

> [!bug] nullsFirst bug (load-bearing)
> `order()` staví ORDER BY přes raw ``sql`${col} ASC/DESC` `` + volitelně `NULLS FIRST/LAST`, **NE** přes drizzle `asc()/desc().nullsFirst()`. Ten chaining API není stabilní napříč verzemi drizzle a **tiše házel za běhu** (projevilo se prázdnou stránkou Akce). Viz [[Deník změn]].

> [!bug] Gotcha: timestamptz update → Date objekt, NE ISO string
> Přes shim (drizzle) do `timestamp(...)` sloupce (mode 'date') **posílej `new Date()`**, ne `new Date().toISOString()`. String hodí runtime chybu **`"e.toISOString is not a function"`** a **celý update spadne** (shim vrátí `{error}`, ostatní sloupce v tom samém `.set()` se taky nezapíšou). Zjištěno na `client_reports.sent_at` (send reportu tiše nefungoval). Ověřeno debug endpointem 2026-09-05.
> ✅ **Latentní výskyty vymeteny 2026-09-05** — 48 write-sitů v 19 souborech přepnuto na `new Date()` (commit `a3da246`). Viz [[Deník změn]].
> **NEMĚNIT** (a nezavádět zpátky): ISO string je OK ve dvou kontextech, které přes `.set()` neprochází — (1) `date` sloupce a display přes `new Date().toISOString().slice(0,10)` / `.split('T')[0]` (`work_date`, `issue_date`, `next_touch_at`, `stale_reminded_at`, …); (2) **filtry v WHERE** (`.gt/.gte/.lte('expires_at'|'scheduled_at'|'start_time', iso)`) — shim je bere jako raw string, `.toISOString()` na nich nevolá.

## Schéma — `src/lib/db/schema.ts`
- **Auto-generované** z živého Neon schématu (hlavička varuje: needitovat ručně, regenerovat přes `scripts/gen-drizzle-schema`).
- **91 `pgTable`** + ~40 `pgEnum`. Skupiny: Better-Auth (`users/account/session/verification`), tenancy (`tenants/tenant_users/custom_roles/profiles`), CRM/leady, finance (`invoices/transactions/expense_claims`), quotes, suppliers/PO, HR, events, projects/time, documents/business_contracts/deliverables, portal (`portal_access/invites/messages/visibility_overrides`), mail, social, ops, personal, notifications/push, AI, `company_settings`, `milestones`, `audit_log`.

## Multi-tenant izolace 🔐
- Každá doménová tabulka má `tenant_id uuid NOT NULL`.
- Tenant se resolvuje server-side z `tenant_users` (`src/lib/supabase/tenant.ts`, `src/lib/auth/context.ts`).
- **RLS je za běhu obcházené** — `getAuthContext()`/`requireTenant()` vrací admin/service-role klienta **po ověření user+tenant v aplikačním kódu** (ADR 0002 „bezpečné výjimky"). Izolace tedy stojí na aplikačním kódu, ne na Postgres policies.
- Aplikace se připojuje jako `neondb_owner` (vlastník tabulek) → REVOKE/append-only triggery chrání jen proti bugům appky, ne proti DB ownerovi.

## Migrace
- Raw SQL v `supabase/migrations/` (~55 forward `20240530…`–`20240653…` + `down/` reverze).
- Aplikace přes `scripts/apply-migration.mjs` (samostatný `pg.Client`): `DATABASE_URL="…" node scripts/apply-migration.mjs supabase/migrations/<file>.sql`.
- ⚠️ Simple query protocol → celý soubor = implicitní transakce → **NELZE `CREATE INDEX CONCURRENTLY`** v migraci.

Souvisí: [[Architektura]] · [[Autentizace a role]] · [[Leady a Akvizice]]
