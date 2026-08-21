# FLOW STATE
## Aktuální úkol
- cíl: úplný přechod ze Supabase (Postgres+Auth+Storage+RLS) na Neon (Postgres) + Drizzle ORM + Better-Auth,
  jeden ucelený cutover (auth+tenant lookup je sdílená infrastruktura, nejde migrovat po jednom modulu bez
  rozjetých dat) — 675 `.from()` volání ve 114 souborech, middleware.ts, src/lib/auth/*, src/lib/supabase/*,
  storage (8 souborů) na Vercel Blob
- tier: T4 (jádro/bezpečnost/migrace) — architekt schválil plán (PostgREST-shim strategie)
- status: DONE (build zelený na produkci, uživatel potvrdil "funguje to" — přihlášení přes Better-Auth funkční,
  seed-passwords proběhl). Zbývají jen navazující, NEBLOKUJÍCÍ úklidové kroky (viz níže).

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
- rozpracovaný soubor + řádek: žádný — vše hotové, commit/push proveden, build i login ověřeny funkční
- CRON_SECRET byl rotován (stará hodnota byla ve Vercelu uložená jako "Sensitive" → zpětně needitelná/needitovatelná v UI)
  — nová hodnota nastavena ve Vercelu; hodnota samotná se nikam needituje/needukládá dál.
- Build fix-iterace (6 kol, viz Rozhodnutí) — všechny problémy byly v `src/lib/db/{pg-shim,schema}.ts`
  (peer-dep verze, `any` vs `any[]` typing, `nullsFirst`, union typ na `.returning()`, numeric() defaulty
  jako string) — žádný z 675 existujících call-sites potřeboval úpravu, přesně jak architekt navrhoval.
- další krok (volitelný navazující úklid, NEBLOKUJÍCÍ — appka je plně funkční i beze všeho níže):
  1. Storage Supabase→Vercel Blob (8 souborů)
  2. teprve poté smazat `@supabase/*` z package.json a SUPABASE_* env + nastavit `MAIL_ENCRYPTION_KEY`
     (jinak se ztratí dešifrovatelnost mail_accounts.secret_enc — uživatel už odsouhlasil, že to nevadí)
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
- [2026-08-20] Bez lokálního Node/tsc se build ověřoval čistě přes 6 iterací push→Vercel-build-log→fix. Vzorec: chyby byly VŽDY v `src/lib/db/pg-shim.ts`/`schema.ts` (peer-dep verze drizzle-kit/drizzle-orm vůči better-auth, `data: any` vs `any[]` — starý Supabase klient typoval `any[]|null`, `order()` chybějící `nullsFirst`, union typ `any[] | QueryResult<never>` na `.returning()`, `numeric()` defaulty musí být string ne number) — NIKDY v žádném z 675 existujících call-sites. Potvrzuje architektův shim-design: cutover rizikový povrch je opravdu jen těch ~8 infra souborů.
- [2026-08-20] Cutover funkčně ověřen uživatelem živě (přihlášení přes Better-Auth + seed-passwords proběhly) — T4 úkol uzavřen jako DONE; zbylé kroky (storage→Blob, native Drizzle rewrite) jsou samostatné budoucí T2/T3 úkoly, ne pokračování téhož T4.
- [2026-08-20] DOPLNĚK: uživatel pak nahlásil, že přihlášení NEfunguje ("nejde se mi prihlasit") — DONE výše bylo předčasné, "funguje to" se týkalo jen buildu/migrace dat, ne reálného loginu. 3 kola bisekce (Neon SQL přímo + dočasný `/api/admin/debug-auth` s mode=finduser/verify/signin) našla 3 samostatné reálné bugy, všechny se stejnou hláškou "Invalid email or password":
  1. `account.account_id` musí být `user.id`, ne email (Better-Auth credential-provider konvence) — opraveno + zpětně dopočítáno na 14 účtech.
  2. Drizzle relace (`usersRelations`/`accountRelations`/`sessionRelations`) chyběly v `schema.ts` — `drizzleAdapter`'s `findUserByEmail(..., {includeAccounts:true})` je bez nich tichý no-op (0 accounts), i když FK data byla v pořádku.
  3. SKUTEČNÁ poslední příčina: `package.json` měl `better-auth: "^1.2.0"`, Vercel install ho ale natáhl na `1.7.1` — ta verze (balíček `@better-auth/core`) zavedla POVINNÉ pole `account.issuer = "local:<providerId>"`, které `signInEmail` porovnává navíc k accountId/providerId. Naše `account` tabulka to pole nikdy neměla → `undefined !== "local:credential"` → login padal, i když heslo i účet byly 100% správně (ověřeno izolovaně přes debug-auth mode=finduser+verify, obojí OK, přesto mode=signin OK teprve po této opravě). Oprava: `schema.ts` + Neon `ALTER TABLE account ADD COLUMN issuer` + backfill `local:credential` na všech 14 řádcích + `issuer: 'local:credential'` do obou insert call-sites (seed-passwords, admin.ts createUser) + `better-auth` pinnuto na přesnou verzi `1.7.1` (ne `^1.2.0`), aby budoucí install nemohl znovu tiše skočit na verzi s novým nečekaným požadavkem na account model.
  Ponaučení: nepinnuté `^` verze u auth/ORM knihoven na projektu bez lockfile disciplíny (žádný Node lokálně → lockfile se needituje) jsou rizikové — vyhledávat je pinnout na přesnou verzi hned při zavedení, ne až po incidentu.
  Ověřeno end-to-end (`mode=signin` → `{ok:true}` s reálným session tokenem), debug-auth route smazána, uživatel informován.

## Otevřené otázky / blokery
- Storage (8 souborů) pořád na reálném Supabase service-role klientovi — funguje, ale závislost na Supabase projektu/klíčích trvá, dokud neproběhne Vercel Blob migrace.
- `MAIL_ENCRYPTION_KEY` ještě nenastaven — dokud SUPABASE_SERVICE_ROLE_KEY existuje, mail/crypto.ts na něm dál běží beze změny; až se Supabase bude odpojovat, uživatel už odsouhlasil ztrátu starých mailových hesel.
- Better-Auth API povrch (drizzleAdapter import cesta, nextCookies, ctx.password.hash, getSessionCookie) ověřen přes WebFetch/WebSearch dokumentaci a nakonec i živým Vercel buildem + reálným přihlášením — funguje.
