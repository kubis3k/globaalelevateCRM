---
tags: [domena, portal, bezpecnost]
updated: 2026-09-05
---

# 👤 Klientský portál

Doména **`klient.globaalelevate.com`**, role `external`. Klient vidí jen svá data (auto-share podle `client_id`).

## Stránky — `src/app/(portal)/portal/`
`page.tsx` (přehled), `invoices` ([[Faktury]]), `documents`, `deliverables`, `contracts`, `messages`, `events/[id]`.

## Scope — `src/app/(portal)/portal/scope.ts`
- `getPortalScope()` → `requireTenant()` + lookup `portal_access` podle `user_id` → `{ supabase (admin klient), tenantId, role, clientId }`.
- `getPortalClientContext()` → navíc resolvne `crm_clients` řádek (`id, name, ico, email`) — používá se např. na párování faktur v [[Účto integrace|účtu]].
- `getHiddenIds(admin, clientId, itemType)` → položky, které admin klientovi skryl (`portal_visibility_overrides`).

## Auto-share model
Vše s `client_id` == přihlášený klient je viditelné **defaultně**. `portal_visibility_overrides` umožní admin výjimečně skrýt jednotlivou položku.

## Bezpečnost 🔐 (vrstvy)
1. **Host guard** v `middleware.ts`: na `klient.` doméně smí external jen `/portal`, `/login`, `/auth`, `/force-password-change`, `/invite`; cokoli interního → redirect `/portal`. `/api` průchozí (handler si autorizuje sám). Viz [[Deník změn]].
2. `getAllowedModules` `external → []`, `(dashboard)/layout.tsx` redirect external → `/portal`.
3. **Download routes** re-checkují ownership: portál má vlastní `/api/portal/*` (scope + `doc.client_id === clientId` + hidden overrides). Interní `/api/documents/[id]/download` a `/api/blob/documents` **odmítají roli `external`** → zavřen cross-client únik dokumentů. Viz [[Storage — Vercel Blob]].
4. [[Faktury|Faktura PDF]]: `/api/portal/invoices/[id]/pdf` — ownership přes shodu účto-contactu s klientem (IČO/název).

## Správa (interní strana)
Modul **Portál** (`(dashboard)/portal-admin/`) — přístupy, pozvánky, viditelnost.

Souvisí: [[Autentizace a role]] · [[Faktury]] · [[Storage — Vercel Blob]] · [[Účto integrace]]
