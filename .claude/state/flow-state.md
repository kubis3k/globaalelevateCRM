# FLOW STATE
## Aktuální úkol — KLIENTSKÝ PORTÁL stream (2026-09-05)
- cíl: obecný klientský portál (marketing/weby/akce, ne jen eventy) + interní CRM. Human-readable
  dokumentace jde do Obsidian vaultu `CRM memory/` (uživatel to výslovně chce — aktivně číst i psát).
- DONE dnes (detail ve vaultu Deník + git): portál header ikony (oznámení/nastavení), fix loga,
  demo data, PDF faktury, **Klientské reporty** (tvorba+PDF+odeslání+přílohy), **CRM 360° detail klienta**.
- OPRAVENO: send reportu padal — `sent_at` ISO string do timestamptz (drizzle volá .toISOString()
  na hodnotě → string ji nemá → celý update spadl). Fix `new Date()`. Plošně vymeteno (commit a3da246,
  48 sitů) v samostatné background session.
- Poslední commit: 40a07e8 (přílohy reportů) — ČEKÁ ověření Vercel buildu.
- Další nápady (nezačato): logo firmy do PDF reportu, předvyplnit klienta při „Nový report", CRM
  sekce s posledními událostmi/reporty (teď jen počty), leady PR3.

## PŘEDCHOZÍ FOKUS: LEADY (Obchod → Akvizice) — pozastaveno
- tier: T4. PR2a (migrace) + PR2b (schema.ts + bezpečnost) HOTOVO a nasazeno.
  Další: PR3 (vitest + čisté funkce leads/*). VisionBoost XLSX uživatel doošle (pro PR6).
  Odložené migrace 20240652/20240653 (deferred trigger + region FK) — až formulář/import na kódy krajů.

## PŘEDCHOZÍ ÚKOL (uzavřený, detail v git historii)
- Supabase→Neon+Drizzle+Better-Auth cutover: DONE (login opraven — 3 bugy: account_id,
  Drizzle relations, better-auth issuer; pinnuto na 1.7.1). trustedOrigins pro 3 domény.
  Akce/events bug: pg-shim order() nesmělo volat .nullsFirst()/.nullsLast() (nestabilní
  napříč drizzle verzemi) → přepsáno na raw sql. Storage→Blob: kód hotový, NEcommitnutý
  (business-contracts/documents/hr actions + api/blob + api/*/download + lib/storage/blob.ts),
  čeká na připojení Blob store ve Vercelu. @supabase/* odstraněny z package.json.
## PDF FAKTURY do portálu — DONE (2026-09-05)
- Klient portálu stáhne plný daňový doklad jako .pdf (commit d9a4d2a, build READY).
- Účto NEUKLÁDÁ PDF vydaných faktur (introspekce purple-star-75414719: 0 faktura_vydana,
  uložená PDF jen u faktura_prijata/interni_doklad). Generujeme na straně CRM z účto dat.
- ucto.ts: getUctoInvoiceDetailForClient(id, client) — document + document_line +
  accounting_unit (dodavatel vč. logo_data_url) + contact. Ownership v SQL: účto-contact
  musí matchnout klienta přes IČO/název → IDOR ochrana (external nestáhne cizí fakturu).
- lib/pdf/invoice.ts: pdf-lib 1.17.1 + @pdf-lib/fontkit (pure-JS, žádný chromium). Font
  Roboto VLOŽENÝ base64 (src/lib/pdf/fonts/roboto-{regular,bold}.ts) — NE přes /fonts URL,
  host guard na klient. by fetch přesměroval. @pdf-lib/fontkit nemá typy → src/types/pdf-lib-fontkit.d.ts.
- Route /api/portal/invoices/[id]/pdf (runtime nodejs), tlačítko invoice-download.tsx.
- POZNATEK: Vercel jede `npm install` (ne `npm ci`) — lockfile bývá out-of-sync (např.
  @vercel/blob v něm vůbec není) a builduje se. Stačí přidat dep do package.json.
- ⚠️ Portál teď ukáže prázdno (0 vydaných faktur v účtu) — feature funkční, až vzniknou.
- Dokumentace: přidán Obsidian vault "CRM memory/" (commit 069e859) — kompletní znalostní báze.

## STORAGE→BLOB migrace — DONE (2026-09-05)
- Celá migrace Supabase Storage → Vercel Blob (private) HOTOVÁ, commitnutá a nasazená.
  Store `globaal-documents` (FRA1/Frankfurt, private) připojen k projektu globaalelevate (Prod+Preview).
- KLÍČOVÝ POZNATEK: store byl ve Vercelu připojen s prefixem env proměnných malými písmeny
  (`blob_READ_WRITE_TOKEN`), ale `@vercel/blob` SDK čte jen `BLOB_READ_WRITE_TOKEN` (velkými) →
  runtime hlásil "No blob credentials found". Řešení (commit 314b0b7): `blobToken()` v
  `lib/storage/blob.ts` = `BLOB_READ_WRITE_TOKEN || blob_READ_WRITE_TOKEN`, předán explicitně do
  put/del/get, do handleUpload() v /api/blob/documents a (dočasně) do migrate-storage. Odolné vůči
  oběma prefixům — kdyby se prefix ve Vercelu později srovnal na `BLOB_`, kód pořád funguje.
- Data: 20/20 souborů (19 documents + 1 hr_document) zkopírováno ze Supabase Storage do Blobu POD
  STEJNOU cestou (bez přemapování DB — blobResponse čte podle uložené storage_path). Ověřeno ok:20,
  failedCount:0. Supabase Storage zůstává jako záloha (nemazáno).
- Dočasný `/api/admin/migrate-storage` (Bearer CRON_SECRET) po ověření SMAZÁN.
- POZOR (nemazat): `SUPABASE_SERVICE_ROLE_KEY` musí zůstat ve Vercel env — mail/crypto.ts na něm
  závisí, dokud nebude nastaven `MAIL_ENCRYPTION_KEY`. Supabase JS balík z package.json odstraněn,
  ale service key se pořád používá pro createAdminClient (auth/tenant_users lookup) + mail crypto.
- Bezpečnost (security-guardian APPROVE): /api/documents/[id]/download + /api/blob/documents
  odmítají roli `external` (má vlastní client-scoped /api/portal/... route) — zavřen cross-client únik.

## LEADY — architektův plán (2026-08-21, čeká schválení kroku 2)
- Migrace 7 souborů `supabase/migrations/2024064[5-9]/2024065[01]_*.sql`, rollback konvencí
  `supabase/migrations/down/<stejné jméno>.sql`. Ověřeno: `apply-migration.mjs` posílá celý soubor
  jedním `client.query(sql)` BEZ parametrů → simple query protocol → implicitní transakce, selhání
  statementu = rollback celého souboru. Důsledek: v migracích NELZE `CREATE INDEX CONCURRENTLY`.
- Číselníky: nové `cz_regions` (14 krajů, FK z region) + `crm_industries` (per-tenant, composite FK
  `(tenant_id, industry)`) → rozšiřitelné bez migrace, splňuje „číselník, ne volný text".
- Origin enforcement: `CREATE CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED` na
  `crm_prospects AFTER INSERT` + zrcadlový na `AFTER DELETE ON crm_prospect_origin` (naivní FK
  prospects→origin je cyklický). Korektní pořadí INSERTů v jedné transakci projde, samotný INSERT spadne na COMMIT.
- Skóring: `crm_scoring_config(tenant_id PK, weights jsonb, thresholds jsonb, cadence int[])` +
  `BEFORE INSERT/UPDATE OF` trigger plnící `score_raw`/`score`/`priority` (generated column NELZE —
  není IMMUTABLE, subquery na jinou tabulku). OSM problém: `score` se normalizuje na dosažitelné
  maximum z DOSTUPNÝCH signálů, fronta řadí `priority, web_status_rank, score`.
- Nový kód leadů jde na **nativní Drizzle** (`src/lib/leads/*`), NE přes pg-shim (ten neumí transakce);
  koexistence bezpečná, oba přes tentýž Pool a schema. Existujících 15 call-sites zůstává na shimu.
- Výkon: nové obrazovky = server-side filtry + stránkování (LIMIT 50, searchParams), ne fetch-all.
- Bezpečnost PR2b: `permissions.ts` `if (role==='external') return []` (ověřeno: `/no-access` route
  existuje v `(dashboard)`, sidebar snese prázdné pole), host allowlist v `middleware.ts` pro
  klient./jobs., `Permission` += `leads.manage`/`leads.viewAll`, nový `src/lib/leads/guard.ts`
  (`requireLeadsCtx`, `assertOwnership`, scope 'all'|'own', own = `owner=me OR owner IS NULL`).
- PR mapa: PR1 report → PR2a migrace → PR2b bezpečnost+schema.ts → PR3 vitest+čisté funkce →
  PR4 seznam/detail → PR5 fronta hovorů → PR6 import → PR7 ČTÚ export (HTML print, ne PDF lib).

## Kde jsme skončili (checkpoint)
- LEADY PR2a HOTOVO A APLIKOVÁNO na produkci (main branch): 7 migrací 20240645–20240651
  aplikováno přes psycopg2 (mimika apply-migration.mjs). Ověřeno 47+8 testů na odhozené Neon
  branchi `test-leady-pr2a` (smazána): aplikace, idempotence 2×, skóring (absolutní 0–100,
  per-source prahy), garbage-config degradace, přepočet po změně vah, append-only touches+dnc,
  cascade z tenanta (mina vyřešena), seed nového tenanta, origin enforcement v transakci, VŠECHNY
  down migrace reverzně. Post-check: cz_regions=14, crm_industries=7, crm_scoring_config=1,
  crm_prospect_origin + crm_do_not_call existují.
- ZÁMĚRNĚ NEAPLIKOVÁNO (čeká na PR2b): `20240652_prospect_origin_enforce.sql` (deferred trigger —
  rozbil by dnešní zápis prospektů, dokud nepůjde přes db.transaction()) a
  `20240653_prospect_region_fk.sql` (FK region→cz_regions — rozbil by dnešní volný text „Praha",
  dokud se formulář+import nepřepnou na kódy krajů).
- rozpracovaný soubor: žádný. Migrace commitnuty (jen supabase/migrations/* + flow-state; storage→Blob
  změny v pracovním stromu ZÁMĚRNĚ mimo tento commit — jiný rozsah).
- další krok: PR2b — schema.ts (crm_prospect_origin, crm_do_not_call, crm_scoring_config, cz_regions,
  crm_industries + nové sloupce crm_prospects), bezpečnost (external zákaz, host guard, leads.* perms,
  guard.ts), pak teprve 652+653. Před PR6 potřeba `VisionBoost_Sales_Leads.xlsx` (chybí).

## Mapa poznání (co víme o codebase)
- src/middleware.ts: `getSessionCookie()` z `better-auth/cookies` (jen existence cookie, edge-safe);
  `/api/*`, `/jobs/*`, `/invite/*` mimo auth guard (cron Bearer token, veřejné trasy) — nezměněno
- src/lib/db/pg-shim.ts: `resolveTable`/`col()` mapují snake_case table/column name → `schema.ts` property
  (1:1, žádný převod) — proto MUSÍ `schema.ts` mít snake_case klíče pro všechny tabulky KROMĚ
  users/session/account/verification (ty camelCase, better-auth konvence)
- node/npm/vercel CLI NEJSOU v tomto shellu dostupné (žádný Node.js vůbec) — build/tsc/dev nelze ověřit
  lokálně; uživatel vědomě zvolil push přímo na main bez preview-branch pojistky (přijal riziko)
- Vercel projekt "globaalelevate" (team lapone277-3095s-projects, prj_B7GrHvDOAS4TJMlRM22IYe9C7mcg) =
  tento CRM (domény work/klient/jobs.globaalelevate.com), auto-deploy z `main`
- .claude/agents/*.md: definice se za běhu NEMĚNÍ (prompt cache) — self-improvement jde přes
  `.claude/state/learnings/<agent>.md`, ne přes editaci agentů
- LEADY/AKVIZICE (Fáze 0, 2026-08-21): sekce UŽ EXISTUJE a je funkční, ne placeholder —
  `src/lib/modules.ts:22` (id `prospects`, href `/prospects`), skupina Obchod v
  `src/components/collapsible-sidebar.tsx:63`. Vertikální slice: `src/app/(dashboard)/prospects/`
  {page.tsx (server fetch všeho), prospects-client.tsx (435 ř., filtry client-side v useMemo,
  detail dialog, změna status/owner), actions.ts (175 ř.)}. Dále `src/app/api/prospects/import/route.ts`
  (čeká hotové `rows` v JSON, dedupe dle IČO), `api/cron/route.ts:185-220` (digest due-touches),
  `reports/page.tsx:126-127`. Celkem 15 call-sites. Drizzle: `schema.ts:234` crmProspects, `:223` crmProspectTouches.
- Migrace: `supabase/migrations/*.sql`, konvence `YYYYMMDDHHMMSS_nazev.sql` (42 souborů), ŽÁDNÝ ledger
  ani npm script — ruční `node scripts/apply-migration.mjs <file>`. Idempotentní (`IF NOT EXISTS`), žádná
  down-migrace v repu. Dva soubory mají kolidující timestamp `20240639000000`.
- XLSX vzorec: jediné použití `events/[id]/event-budget.tsx:55-70` — `await import('xlsx')` CLIENT-SIDE,
  `sheet_to_json` → parsed pole poslána server action. Server soubor nikdy nevidí.
- `company_settings` (`schema.ts:146-164`, PK tenant_id) = per-tenant config, čte
  `settings/page.tsx:10`, píše `settings/actions.ts:25`. Váhy skóringu sem (nový jsonb sloupec).
- Identity: `users` (Better-Auth, `schema.ts:1194`) je zdroj pravdy; `profiles` (`:941`, jen id/username/
  full_name) je 1:1 alias (ověřeno SQL: 14/14, 0 users bez profilu), vzniká best-effort upsertem v
  `team/actions.ts:40` a `invite/[token]/actions.ts:34`. Kód plní ownery VŽDY `ctx.userId` = users.id.
  DB FK ale nekonzistentní: `crm_prospects.owner`→`profiles(id)`, `crm_prospect_touches.created_by`→`users(id)`.
- Aplikace se k Neonu připojuje jako `neondb_owner`, což je ZÁROVEŇ owner všech tabulek (ověřeno SQL)
  → REVOKE práv aplikační roli je bezzubé (owner si je kdykoli re-grantuje). Žádná least-privilege role neexistuje.
- Testy v repu NEEXISTUJÍ: 0 `*.test.ts`/`*.spec.ts`, žádný vitest/jest config, `package.json` nemá `test` script.
- Autorizace není jednotná: `requirePermission()` použit jen ve 2 souborech; CRM má vlastní lokální
  `getCtx()` (`crm/actions.ts:9-17`) kontrolující JEN příslušnost k tenantu, bez role. `permissions.ts`
  zná role admin|manager|employee|external a 7 permissions — `crm.*`/`leads.*` mezi nimi NEJSOU.
  `getAllowedModules()` bez custom role vrací VŠECHNY moduly (i pro roli `external`). Nikde v repu není
  row-level ownership filtr (vše filtruje jen `tenant_id`).
- `src/middleware.ts` (53 ř.): host se řeší JEN pro `jobs.` (rewrite na `/jobs/*`, ř. 14-19).
  Pro `klient.` NEEXISTUJE žádná větev. `/api/*` je z guardu úplně vyňato (ř. 23-25).

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

- [2026-08-21] LEADY Fáze 0 (T4, 2 paralelní scouti + přímá SQL verifikace Neonu). Schéma v zadání je
  přesné (ověřeno `pg_attribute`/`pg_constraint`): `crm_prospects` 20 sloupců, `crm_prospect_touches` 8,
  oba prázdné (0 řádků), `crm_prospect_origin` ani `crm_do_not_call` neexistují. Blokující otázka zadání
  (`profiles` vs `users`) rozhodnuta: vázat na **`users.id`** — je to identita z Better-Auth session,
  kterou kód všude plní jako owner/created_by; `profiles` je best-effort 1:1 alias, který může chybět.
  Rozpor v DB FK (`crm_prospects.owner`→profiles) je legacy, sjednocení by znamenalo zásah do
  `crm_prospects` FK → navrhuji řešit až se souhlasem, nová `crm_prospect_origin.acquired_by`→`users(id)`.
- [2026-08-21] LEADY: BEZPEČNOSTNÍ ZJIŠTĚNÍ (blokující, doloženo kódem) — portálový uživatel (`role='external'`,
  má řádek v `tenant_users`, vzniká `invite/[token]/actions.ts:37`) se dnes DOSTANE na server actions modulu
  Obchod: (a) `middleware.ts` nemá pro `klient.` žádnou větev a `/api/*` je z guardu vyňato, (b)
  `getAllowedModules()` bez `custom_role_id` vrací všechny moduly včetně `crm`/`prospects`, (c)
  `crm/actions.ts:9-17` ověřuje jen příslušnost k tenantu, ne roli. Server Action = POST endpoint,
  skrytí v navigaci není ochrana. Pro modul s právní evidencí ČTÚ je to nutné opravit před spuštěním.

- [2026-08-21] LEADY — uživatel rozhodl 3 blokery Fáze 0:
  (1) Append-only touches = **trigger + REVOKE**, ne nová DB role. Vědomě přijata slabší záruka: chrání
      proti chybě v aplikaci, NE proti komukoli s owner přístupem k DB. Akceptační kritérium
      „UPDATE/DELETE selže i pro aplikační roli" tím zůstává splněno jen částečně — zdokumentovat v PR.
  (2) Testy = **zavést vitest** (schválená nová závislost). Pozor: v tomto shellu není Node → testy
      nelze lokálně spustit, ověření musí proběhnout u uživatele nebo v CI na Vercelu.
  (3) Bezpečnostní izolace = ponecháno na doporučení agenta → **opravit hned před leady, chirurgicky**:
      zákaz `external` v `getAllowedModules`, host guard pro `klient.`/`jobs.` na dashboard routes,
      permission+ownership check v nových lead actions, a doplnění role checku do existujících CRM
      actions (vědomě mimo deklarovaný rozsah leadů — stejná díra, nemá smysl ji nechat otevřenou).
      Podmínka: nejdřív ověřit, že `(portal)` route group nezávisí na `requireModuleAccess()`.

- [2026-08-21] LEADY PR2a APLIKOVÁNO na produkci. Coder padl na session limit po částečné práci,
  dodělal jsem migrace + fix-round (8 bodů criticu) sám v hlavní session. Skóring přepracován dle
  rozhodnutí: absolutní body 0–100 (ne normalizace — ta odměňovala neznalost: lead jen s telefonem
  by vyšel 100/A), prahy PER-SOURCE (default 70/50, osm 45/30, web_firmy 55/40). score_raw zrušen.
  Přidán seed trigger na nové tenanty (industries+scoring config), composite FK industry DEFERRABLE
  (jinak DELETE tenanta padal), defenzivní fn_jsonb_num (garbage config nesmí zablokovat zápis),
  do_not_call enforcement trigger na crm_prospects. Down migrace přemapovávají porušující řádky před
  zúžením CHECKů (jinak rollback padá na existujících datech). Vše ověřeno na odhozené Neon branchi.
  Region FK a origin-enforce odloženy do PR2b (rozbily by dnešní zápisovou cestu).

- [2026-08-21] LEADY PR2b HOTOVO (commit 5d5257e). schema.ts rozšířen o 5 nových tabulek + sloupce,
  ověřeno introspekcí proti Neon main (priority=char(1), cadence=integer[]). Bezpečnost: getAllowedModules
  external→[], leads.manage/leads.viewAll permissions, src/lib/leads/guard.ts (resolveLeadsCtx blokuje
  external roli + klient./jobs. host, scope all|own, canTouchLead), external odmítnut v crm+prospects getCtx.
  ROZHODNUTÍ (odchylka od slibu uživateli): globální middleware host guard NEudělán — riziko rozbití
  portálu naslepo bez lokálního buildu > přínos; host se kontroluje v leads guardu (kde to test měří).
  Row-level ownership seznamu odloženo do PR4 (potřebuje přepis prospects page/UI na server-side scope);
  v PR2b jen zavřena díra external přístupu. Uživatel odsouhlasil viditelnou změnu (external ztratí dashboard).

## Otevřené otázky / blokery

### PORTÁL + STORAGE MIGRACE (2026-09-04) — AKTIVNÍ
- Host guard pro klient. doménu + smazání seed-passwords NASAZENO (commit bfb2200, security-guardian APPROVE).
- OBJEVENO: celá storage migrace Supabase Storage→Vercel Blob z dřívějška NIKDY necommitnuta —
  visí v pracovním stromě (21 souborů: api/blob, api/documents, api/hr, api/portal routes, lib/storage/,
  přepsané uploady, smazaný supabase/client.ts, package.json @vercel/blob). Produkce běží dál na
  STARÉM committed Supabase storage (funguje). git stash NEDĚLAT — je to hotová práce k dokončení.
- Bezpečnostní fix /api/documents/[id]/download + /api/blob/documents (external→403) je PŘIPRAVENÝ
  v pracovním stromě, ale VÁZANÝ na storage migraci (ty routy nejsou v produkci). NENÍ akutní díra
  (route není nasazená). Nasadí se SPOLU se storage migrací.
- BLOKER: dokončení storage migrace čeká na (1) uživatel připojí Vercel Blob store (env
  BLOB_READ_WRITE_TOKEN — MCP to nevidí, jen uživatel v dashboardu), (2) data copy 20 souborů
  (19 documents + 1 hr_document, ověřeno SQL) Supabase→Blob — plán: jednorázový Bearer endpoint
  (server má oba env tokeny: SUPABASE_SERVICE_ROLE_KEY ještě žije + nový BLOB token), stáhne+nahraje,
  smaže. Pak deploy migrace+bezpečnost, ověření curl.
- Uživatel zvolil "Dokončit celou storage migraci + bezpečnost", Blob store "nevím" → čeká se na připojení.

### LEADY — zbývající otevřené body (2026-08-21)
- `VisionBoost_Sales_Leads.xlsx` stále chybí — akceptační kritérium importu nelze verifikovat.
- Nerozhodnuto: seznam 1 000 leadů — zůstat u fetch-all + client filtr (vzorec repa), nebo zavést
  server-side filtr/paginaci? Ponecháno na architektův návrh.
### LEADY — původních 5 blokerů z Fáze 0 (3 rozhodnuty výše, viz Rozhodnutí)
1. **REVOKE UPDATE/DELETE na `crm_prospect_touches` je nesplnitelné, jak je zadané.** App jede jako
   `neondb_owner` = owner tabulek. Zadání explicitně odmítá trigger ("skutečné odebrání práv").
   Varianty: (a) nová least-privilege DB role + změna DATABASE_URL ve Vercelu (infra změna),
   (b) revoke + `ALTER TABLE ... OWNER TO` jiné roli, (c) přijmout trigger/rule jako slabší záruku.
2. **Testy neexistují** — akceptačka žádá 3 testy (403 z klient. session, obchodník A/B izolace, dedupe).
   Zavedení vitestu = nová závislost, zadání zakazuje nové závislosti bez souhlasu.
3. **Doménová izolace je dnes reálně prolomitelná** (viz Rozhodnutí) — nutná oprava PŘED spuštěním leadů,
   ale sahá do `middleware.ts` + `permissions.ts` + cizích CRM actions = mimo deklarovaný rozsah leadů.
4. **`score` nemůže být generated column, když váhy leží v `company_settings`** — PG generated column musí
   být IMMUTABLE a nesmí mít subquery na jinou tabulku. Buď trigger, nebo výpočet v app při zápisu.
5. **`VisionBoost_Sales_Leads.xlsx` není přiložen** (nenalezen v Downloads ani Desktop) — akceptační
   kritérium "import přiloženého XLSX projde" nelze verifikovat.

- Storage (8 souborů) pořád na reálném Supabase service-role klientovi — funguje, ale závislost na Supabase projektu/klíčích trvá, dokud neproběhne Vercel Blob migrace.
- `MAIL_ENCRYPTION_KEY` ještě nenastaven — dokud SUPABASE_SERVICE_ROLE_KEY existuje, mail/crypto.ts na něm dál běží beze změny; až se Supabase bude odpojovat, uživatel už odsouhlasil ztrátu starých mailových hesel.
- Better-Auth API povrch (drizzleAdapter import cesta, nextCookies, ctx.password.hash, getSessionCookie) ověřen přes WebFetch/WebSearch dokumentaci a nakonec i živým Vercel buildem + reálným přihlášením — funguje.
