# ADR-0002: Audit současného stavu a plán Fáze 1 (bezpečnost + kvalita)

- **Status:** Přijato
- **Datum:** 2026-07-22

## Audit současného stavu

### Service-role klient
`src/lib/supabase/admin.ts` (`createAdminClient`) používá **36 souborů**. Vzniká tím riziko:
- mutace obcházejí RLS, takže jediná ochrana je aplikační `getCtx()` v každém `actions.ts`,
- `getCtx()` je **duplikovaný** v ~20 souborech a ověřuje většinou jen `tenant_id`, ne oprávnění,
- domény `finance`, `crm`, `projects`, `suppliers` nemají **žádnou** kontrolu role u mutací.

Legitimní systémové použití service-role (musí zůstat): cron (`api/cron`), veřejné routes (`jobs`, `invite`, `prospects/import`) kde není přihlášený uživatel, a resoluce tenantu v `requireTenant` (obchází RLS rekurzi).

### Typová bezpečnost
- `tsconfig.json` už je `strict: true`, ale `next.config.ts → typescript.ignoreBuildErrors: true` to při buildu vypíná.
- `src/types/database.types.ts = any` → žádný dotaz není typovaný.
- Reálných `tsc` chyb je jen **7**: chybějící deklarace `xlsx`/`mailparser`/`pg` a 3× implicit-any parametr. Nízké riziko odstranit flag.

### Audit
- Existuje jen `hr_audit` (změny mezd). Chybí obecný auditní log pro finance, oprávnění, portál, smlouvy a mazání dokumentů.

### Šifrování
- `src/lib/mail/crypto.ts` odvozuje AES klíč z `SUPABASE_SERVICE_ROLE_KEY`. Rotace service-role by znehodnotila všechna uložená hesla schránek. Klíč je nutné oddělit.

## Plán Fáze 1 (po commitech)

1. **Type-safe build** — doplnit chybějící deklarace modulů, opravit implicit-any, `ignoreBuildErrors: false`, přidat `typecheck` skript. (nízké riziko)
2. **Generované DB typy** — `database.types.ts` nahradit reálnými typy ze Supabase; klienty otypovat. Zbylé chyby řešit postupně; kde je typový tlak příliš velký, dočasně izolovat, ne vrátit `any` globálně.
3. **Jednotný auth/tenant/permission context** (`src/lib/auth/`) — jedna funkce `requireAuthContext()` + `requirePermission()`; nahradit lokální `getCtx()` v citlivých doménách (finance, team, portal-admin, business-contracts, mazání dokumentů, HR mzdy).
4. **Auditní log** (`src/lib/audit/` + tabulka `audit_log`) — zápis citlivých akcí; wiring do citlivých domén.
5. **Oddělení mail klíče** — `MAIL_ENCRYPTION_KEY` s bezpečným fallbackem na starou derivaci (bez ztráty dat) + jednorázová re-enkrypce.

Fáze 1 nemění UI ani veřejné chování; přidává obrannou vrstvu a typovou bezpečnost.

## Bezpečné výjimky service-role (dokumentováno)

| Místo | Důvod |
|---|---|
| `api/cron` | běží bez uživatele, autorizace Bearer `CRON_SECRET` |
| `(public)/jobs/*`, `invite/[token]` | veřejné, bez session; zápis validován tokenem/scopem |
| `api/prospects/import` | strojové volání, Bearer `PROSPECTS_IMPORT_SECRET` |
| `lib/supabase/tenant.ts` | resoluce tenantu obchází RLS rekurzi (čtení `tenant_users`) |
| `lib/auth/*` (nově) | autorizovaný context sám používá admin klient až po ověření uživatele+oprávnění |
