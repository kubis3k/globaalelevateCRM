# FLOW STATE
## Aktuální úkol
- cíl: úplný přechod ze Supabase (Postgres+Auth+Storage+RLS) na Neon (Postgres) + Drizzle ORM + Better-Auth,
  jeden ucelený cutover (auth+tenant lookup je sdílená infrastruktura, nejde migrovat po jednom modulu bez
  rozjetých dat) — 675 `.from()` volání ve 114 souborech, middleware.ts, src/lib/auth/*, src/lib/supabase/*,
  storage (8 souborů) na Vercel Blob
- tier: T4 (jádro/bezpečnost/migrace) — architekt schválil plán (PostgREST-shim strategie), implementace hotová
- status: running (kód hotový a commitnutý/pushnutý, čeká se na uživatele: Vercel env vary + build log + seed-passwords)

## Kde jsme skončili (checkpoint)
- poslední dokončený krok: cutover implementován jako PostgREST-kompatibilní shim (architektův návrh) —
  `src/lib/db/{schema,index,pg-shim}.ts` (Drizzle nad Neon, `.from()` beze změny na 675 call-sites),
  `src/lib/auth/{auth,client}.ts` + `src/app/api/auth/[...all]/route.ts` (Better-Auth, `public.users`
  recyklováno přes modelName mapping + nové `session`/`account`/`verification` tabulky na Neonu),
  `src/lib/supabase/server.ts` přepsáno na 100% shim (žádná Supabase závislost), `src/lib/supabase/admin.ts`
  shim pro `.from()`/`.auth.admin.*` + STÁLE reálný Supabase service-role klient jen pro `.storage`
  (Storage→Vercel Blob je vědomě odloženo na navazující krok — Supabase se zatím nemaže, takže žádné
  soubory/mail_accounts secret nejsou ohroženy). `src/middleware.ts` → `getSessionCookie()` (edge-safe,
  bez DB dotazu). `getAuthContext()`/`requireTenant()`/`login/actions.ts`/`signout/route.ts`/
  `invite/actions.ts`/`team/actions.ts`/`portal-admin/actions.ts` NEPOTŘEBOVALY žádnou úpravu — shim
  věrně replikuje stejné metody/tvary (`.auth.getUser()`, `.auth.admin.createUser/deleteUser`, `{data,error}`).
  Upraveno jen: change-password-dialog.tsx (authClient), calendar-view.tsx (odstraněn mrtvý Supabase
  Realtime `.channel()` — žádná náhrada na Neonu, kalendář bez live-push). Nové: `/force-password-change`
  stránka + `must_change_password` flag na `users` (gate v dashboard i portal layoutu) + jednorázový
  `/api/admin/seed-passwords` route (heslo `Globaal43!` všem 14 uživatelům, Bearer CRON_SECRET).
  Smazáno: `src/types/database.{generated,types}.ts` (nepoužívané, nahrazeno `src/lib/db/schema.ts`).
- rozpracovaný soubor + řádek: žádný — vše hotové, commit/push proveden
- další krok (na uživateli, MUSÍ proběhnout než appka půjde spustit):
  1. Vercel env: `DATABASE_URL` (Neon pooled connection string), `BETTER_AUTH_SECRET` (random) — bez nich
     appka spadne na každém requestu. `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY`/`CRON_SECRET`
     ZŮSTÁVAJÍ (storage passthrough + seed-passwords je používají).
  2. Zkontrolovat Vercel build log (typescript.ignoreBuildErrors=false → build spadne na první TS chybě,
     to je jediný "compiler" co tuhle migraci ověří — node/npm/tsc nejde lokálně).
  3. Po zeleném buildu zavolat `POST /api/admin/seed-passwords` (Bearer CRON_SECRET) — nastaví heslo
     `Globaal43!` všem, kdo ještě nemají credential účet, a `must_change_password=true`.
  4. Ověřit přihlášení v browseru (login → force-password-change → dashboard).
- pak (samostatný navazující krok, ne blokující): Storage Supabase→Vercel Blob (8 souborů), teprve poté
  smazat `@supabase/*` z package.json a SUPABASE_* env + nastavit `MAIL_ENCRYPTION_KEY` (jinak se ztratí
  dešifrovatelnost mail_accounts.secret_enc — uživatel už odsouhlasil, že to tehdy nevadí).
- POST-cutover (T2 úkoly, až po ověřeném zeleném buildu): postupný přepis 675 `.from()` volání na nativní
  Drizzle po doménách (viz architektův plán P-a..P-e: hr, crm/finance, projects/events/time,
  portal/social/ops/team, documents/mail/ai/misc) — shim zůstává funkční, dokud nejsou VŠECHNY hotové.

## Mapa poznání (co víme o codebase)
- src/lib/supabase/server.ts + admin.ts = teď 100%/částečně shim (viz checkpoint), client.ts NEZMĚNĚNO
  (reálný Supabase browser klient, jen pro `uploadToSignedUrl` token-based upload, 3 soubory)
- src/lib/auth/context.ts: `getAuthContext()`/`requirePermission()` + nově `mustChangePassword(userId)` —
  JEDNOTNÝ auth+tenant+permission entry point, používaný v ~27 `actions.ts`, NEZMĚNĚNO (shim věrně
  replikuje `.auth.getUser()`/`.from()` tvar)
- src/middleware.ts: `getSessionCookie()` z `better-auth/cookies` (jen existence cookie, edge-safe);
  `/api/*`, `/jobs/*`, `/invite/*` mimo auth guard (cron Bearer token, veřejné trasy) — nezměněno
- src/lib/db/pg-shim.ts: `resolveTable`/`col()` mapují snake_case table/column name → `schema.ts` property
  (1:1, žádný převod) — proto MUSÍ `schema.ts` mít snake_case klíče pro všechny tabulky KROMĚ
  users/session/account/verification (ty camelCase, better-auth konvence)
- scripts/apply-migration.mjs: čistý `pg` klient, funguje na libovolný Postgres přes DATABASE_URL (i Neon)
- Storage (8 souborů s `.storage.`) VŠECHNY jdou přes `createAdminClient()` (service-role) KROMĚ 3
  browser-only `uploadToSignedUrl` volání (client.ts, token-based, nezávislé na session) — proto storage
  zůstává bezpečně funkční na reálném Supabase i po ztrátě Supabase Auth session
- node/npm/vercel CLI NEJSOU v tomto shellu dostupné (žádný Node.js vůbec) — build/tsc/dev nelze ověřit
  lokálně; uživatel vědomě zvolil push přímo na main bez preview-branch pojistky (přijal riziko)
- Vercel projekt "globaalelevate" (team lapone277-3095s-projects, prj_B7GrHvDOAS4TJMlRM22IYe9C7mcg) =
  tento CRM (domény work/klient/jobs.globaalelevate.com), auto-deploy z `main`
- .claude/agents/*.md: definice se za běhu NEMĚNÍ (prompt cache) — self-improvement jde přes
  `.claude/state/learnings/<agent>.md`, ne přes editaci agentů

## Rozhodnutí (append-only)
- [2026-07-13] Flow triáž (T0–T4) se aktivuje automaticky na každý prompt v tomto repu, ne jen na explicitní `/flow` — uživatel to tak výslovně chtěl. T0/T1 zůstává v hlavní session (spawn by byl zbytečný náklad), T2+ jede plný postup.
- [2026-07-13] Zip README (obsahoval instrukce k vložení do CLAUDE.md) NEpřepsal projektový README.md — uložen zvlášť jako `.claude/FLOW.md`, aby se nesmazala existující Next.js dokumentace.
- [2026-07-13] Sebezlepšování agentů řešeno explicitními git-verzovanými soubory `.claude/state/learnings/<agent>.md` (čitelné, prořezatelné scribem) vedle vestavěné opaque `memory: project` funkce Claude Code — ne náhradou, ale doplňkem.
- [2026-07-13] Guest list (modul AKCE) rozšířen o odškrtávací příznaky is_vip / is_permanent vedle existujícího typu (guest/press/artist/staff/promoter); rozpočet akce nově má řádkové položky `event_budget_items` importovatelné z Excelu (knihovna `xlsx`, parsování v prohlížeči, server action nahradí celý rozpočet akce).
- [2026-08-20] Uživatel zvolil ÚPLNÝ přechod ze Supabase na Neon+vlastní auth (ne jen přesun Postgres storage) — Drizzle ORM (ne Prisma/raw pg), Better-Auth (ne vlastní od nuly), Vercel Blob pro storage (ne S3/R2), a cutover VŠECHNO NAJEDNOU (ne po modulech) protože auth/tenant lookup je sdílená infrastruktura.
- [2026-08-20] Push přímo na `main` bez feature-branch/preview pojistky — uživatel vědomě zvolil rychlejší/rizikovější variantu i bez možnosti lokálního ověření (chybí Node).
- [2026-08-20] RLS na Neonu neutralizováno (CREATE POLICY i ENABLE ROW LEVEL SECURITY odstraněny při přenosu migrací) — nahradí ho aplikační autorizace v `getAuthContext()`/`requirePermission()`. Postgres table owner (neondb_owner) by RLS s nulou policies stejně bypassoval.
- [2026-08-20] Objeven schema drift oběma směry mezi tracked migracemi a živou Supabase produkcí: chybějící `mail_accounts`/`meetings`/`meeting_action_items` (existovaly v prod, ne v migracích) a chybějící `invoices.overdue_notified_at`/`notification_prefs.{events,invoices,meetings,portal}` (opačně) — obojí doplněno na Neon. Nesouvisející legacy tabulky `Role`/`User` (Prisma styl, 1 řádek každá, žádné FK) v zdrojové DB NEbyly migrovány.

## Otevřené otázky / blokery
- Node.js není v tomto shellu dostupné vůbec — každá TS/build chyba se pozná jen z Vercel build logu po push, ne lokálně.
- Uživatel MUSÍ přidat `DATABASE_URL` + `BETTER_AUTH_SECRET` do Vercel env, jinak appka nenaběhne (viz checkpoint).
- Vercel MCP nemá nástroj na čtení/zápis env var hodnot — kopírování SUPABASE_SERVICE_ROLE_KEY do MAIL_ENCRYPTION_KEY (až přijde na řadu) musí udělat uživatel ručně v dashboardu.
- Better-Auth API povrch (drizzleAdapter import cesta, nextCookies, ctx.password.hash, getSessionCookie) ověřen jen přes WebFetch/WebSearch dokumentace, NE lokálním compilerem — riziko drobné nepřesnosti v nějakém detailu, sledovat build log.
