---
tags: [auth, bezpecnost, moc]
updated: 2026-09-05
---

# 🔐 Autentizace a role

**Better-Auth** (`1.7.1`) místo Supabase Auth — po cutoveru na Neon.

## Setup — `src/lib/auth/auth.ts`
- `betterAuth` s `drizzleAdapter(db, provider:'pg')`, `user.modelName:'users'` (zachovává původní `public.users` + jejich UUID → desítky FK zůstávají platné).
- Email+heslo (`minPasswordLength:8`, `autoSignIn`, bez email verifikace), plugin `nextCookies()` poslední.
- `trustedOrigins` = 3 domény + `*.vercel.app` (jinak authenticated requesty typu changePassword padají na INVALID_ORIGIN — baseURL fallbackuje na per-deploy VERCEL_URL).
- Klient: `src/lib/auth/client.ts`. Route: `src/app/api/auth/[...all]/route.ts`.

> [!note] Cutover bugy (opraveno)
> Login po migraci padal na 3 bugech: chybějící `account.issuer` (better-auth ≥1.7 vyžaduje `local:credential`), chybějící Drizzle `relations()`, špatné `account_id`. Pin na better-auth 1.7.1. Viz [[Deník změn]].

## Role
Systémový enum `app_role` = **admin / manager / employee / external**. `external` = klienti [[Klientský portál|portálu]].

## Oprávnění — `src/lib/auth/permissions.ts`
- `Permission` union: `finance.manage`, `contracts.manage`, `hr.manage`, `documents.deleteAny`, `team.manage`, `portal.manage`, `settings.manage`, `leads.manage`, `leads.viewAll`.
- `can(role, perm)`: admin → vše; manager → vše kromě `team.manage`/`portal.manage`/`settings.manage`; ostatní → nic.

## Přístup k modulům — `src/lib/permissions.ts`
- `getAllowedModules({role, customRoleModules})`: **`external` → `[]`** (zamčený mimo interní app), `admin` → vše, bez custom role → vše (zpětná kompat), jinak podmnožina custom role.
- Role-check helpery: `canManageHr/Documents/Social/Events/Milestones/SharedMail`.

## Guards — `src/lib/supabase/tenant.ts` + `src/lib/auth/context.ts`
- `requireTenant()` → načte user + `tenant_users` (tenant_id, role, custom_role_id) přes admin klienta, resolvuje `custom_roles.modules`, vrací `{supabase, user, tenantId, role, customRoleId, allowedModules}`.
- `requireModuleAccess(moduleId)` → redirect na první povolený modul (nebo `/no-access`), když uživatel modul nemá.
- `getAuthContext()`, `requirePermission(permission)`, `mustChangePassword(userId)` (Neon-cutover dočasná hesla → `/force-password-change`).

## Vrstvy obrany (portál)
1. `middleware.ts` host guard na `klient.` (viz [[Klientský portál]] / [[Deploy a prostředí]]).
2. `getAllowedModules` `external → []`.
3. `(dashboard)/layout.tsx` redirectuje `external` na `/portal`.
4. Server actions citlivých domén samy odmítají `external` (např. leady guard).

Souvisí: [[Databáze a multi-tenant]] · [[Klientský portál]] · [[Přehled projektu]]
