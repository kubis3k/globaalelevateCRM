---
tags: [architektura, moc]
updated: 2026-09-05
---

# 🏗️ Architektura

Modulární monolit na **Next.js 16 App Router** (ADR 0001). Jedna app, tři domény, server-first (server komponenty + server actions).

## Stack (přesné verze z `package.json`)
- **next** `16.2.6`, **react** / **react-dom** `19.2.4`, **typescript** `^5` (strict, build padá na TS chybách)
- **drizzle-orm** `^0.45.2` (+ drizzle-kit `^0.31.4`) — ORM
- **better-auth** `1.7.1` — auth
- **pg** `^8.21.0` — Postgres driver (Neon + [[Účto integrace|účto]])
- **@vercel/blob** `2.8.0` — [[Storage — Vercel Blob|úložiště]]
- **@base-ui/react** `^1.5.0`, **lucide-react** `^1.17.0`, **shadcn** `^4.8.3`, **class-variance-authority**, **tailwindcss** `^4` — UI
- **@anthropic-ai/sdk** — modul Globaal AI · **recharts** — grafy · **three** `^0.160.0` + `esm-potrace-wasm` — 3D logo studio · **xlsx** — import/export
- **imapflow, nodemailer, mailparser, web-push** — [[Mail a šifrování|mail]] + push (Node-only)
- **pdf-lib** `1.17.1` + **@pdf-lib/fontkit** — generování PDF (přidáno pro [[Faktury]])
- **Bez** test runneru (žádný vitest/jest), **bez** zod, **bez** Stripe SDK.
- Package manager: **npm** (`package-lock.json`). ⚠️ Vercel jede `npm install` (ne `npm ci`) — lockfile bývá out-of-sync a builduje se stejně (stačí editovat jen `package.json`).

## `next.config.ts` — klíčová nastavení
- `typescript.ignoreBuildErrors: false` — **build = jediná TS kontrola** (baseline 0 chyb).
- `experimental.serverActions.bodySizeLimit: '10mb'` — veřejný upload CV.
- `serverExternalPackages: ['imapflow','nodemailer','mailparser','web-push','pg']` — nebundlovat Node libs.
- `turbopack.resolveAlias` stubuje `fs`/`path` na `src/lib/node-empty.js` (potrace WASM).
- `redirects()`: `/` → `/dashboard` **kromě** hosta `jobs.*`.

## Route groups (`src/app`)
- **(auth)** — `login`.
- **(dashboard)** — interní app, 30 modulů (guard v `layout.tsx`). Kanonický seznam: `src/lib/modules.ts` (`MODULES`, `ALL_MODULE_IDS`, `moduleHref`).
- **(portal)** — [[Klientský portál]] (`portal/*`, scope v `scope.ts`).
- **(public)** — `jobs/*` náborový web.
- Volné: `auth/signout`, `force-password-change`, `invite/[token]`, `page.tsx`.

## Vrstvy
- **Data:** `src/lib/db/*` (Drizzle + [[Databáze a multi-tenant|pg-shim]]).
- **Auth:** `src/lib/auth/*`, guards `src/lib/supabase/tenant.ts`.
- **Domény:** každý modul má `page.tsx` + `actions.ts` (server actions). Viz [[00 Index]] → Domény.
- **Integrace:** `src/lib/{ucto,storage,mail,ai,push}/*`.

## Kvalita / CI
- Gate: `npm run typecheck` (`tsc --noEmit`) + `npm run lint` (eslint). **Žádný test framework.**
- GitHub Actions: jen `desktop-build.yml` (Electron DMG buildy). Žádné lint/test CI.
- **Deploy = push na main → Vercel build** (viz [[Deploy a prostředí]]).

Souvisí: [[Přehled projektu]] · [[Databáze a multi-tenant]] · [[Autentizace a role]]
