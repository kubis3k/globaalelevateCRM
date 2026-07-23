# ADR-0001: Směr architektury — modulární monolit

- **Status:** Přijato
- **Datum:** 2026-07-22

## Kontext

Globaal Elevate je rozsáhlý interní CRM+ERP (Next.js 16, React 19, Supabase). Aktuálně:
- business logika žije přímo v Next.js Server Actions (`src/app/**/actions.ts`),
- mutace jdou téměř výhradně přes **service-role** Supabase klienta (obchází RLS),
- většina mutací neověřuje oprávnění, jen tenant,
- background úlohy běží v jednom cron endpointu,
- `typescript.ignoreBuildErrors: true` a `database.types.ts = any`.

## Rozhodnutí

Postupně (bez big-bang přepisu) směřovat k **modulárnímu monolitu**:

```
apps:   web (Next.js UI + tenké routes/actions), [budoucí] worker, [budoucí] API
domény: src/domain/<oblast>/  — čistá business logika + Zod kontrakty
sdílené vrstvy:
  src/lib/auth/     — jednotný auth + tenant + permission context
  src/lib/audit/    — auditní log citlivých akcí
  src/lib/jobs/     — background joby (Fáze 2)
```

Server Actions a API routes se stanou **tenkou adaptační vrstvou**, která volá doménové funkce. Doménová vrstva nezávisí na Next.js → v budoucnu použitelná z Electronu i externího API.

## Principy

1. **Nejdřív bezpečnost a typy** (Fáze 1), pak worker (2), pak doménové rozhraní (3), pak účto projekce (4).
2. Každý krok = malý, samostatně ověřený commit (`tsc` + `build`).
3. Žádné odstranění funkcí ani změna veřejného chování bez nutnosti.
4. Service-role jen pro vymezené systémové operace; vše ostatní přes autorizovaný kontext.

## Trade-offy

- **Proč ne mikroservisy:** provozní jednoduchost (jeden deploy, jedna DB, sdílený kód) převažuje; tým je malý.
- **Proč ne okamžitý přechod na RLS-only:** stovky call-sites přes service-role; bezpečnější je zavést jednotný autorizační context a auditní log a migrovat domény postupně, než najednou přepnout na RLS a riskovat regrese.
