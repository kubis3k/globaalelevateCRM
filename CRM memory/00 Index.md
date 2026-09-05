---
tags: [index, moc]
updated: 2026-09-05
---

# 🗂️ CRM vault — Globaal Elevate

Znalostní báze projektu **globaalelevateCRM** (interní CRM + klientský portál + náborový web).
Píše se sem vše podstatné o projektu — architektura, integrace, rozhodnutí, deník změn.

> [!info] Konvence
> - Noty jsou propojené přes `[[odkazy]]`.
> - „Deník" = append-only, co se kdy udělalo a proč.
> - Rozhodnutí se nemažou, jen doplňují (stejně jako `flow-state.md` v repu).

## Rozcestník

### Základ
- [[Přehled projektu]] — co to je, komu to slouží, domény
- [[Architektura]] — stack, route groups, jak to drží pohromadě
- [[Databáze a multi-tenant]] — Neon, Drizzle, pg-shim, izolace tenantů
- [[Autentizace a role]] — Better-Auth, role admin/manager/employee/external, oprávnění

### Integrace
- [[Účto integrace]] — účetní systém (ucto.globaalelevate.com), read-only zrcadlo financí
- [[Storage — Vercel Blob]] — soubory/dokumenty (migrace ze Supabase)
- [[Mail a šifrování]] — odesílání e-mailů, MAIL_ENCRYPTION_KEY

### Domény aplikace
- [[CRM klienti]] — interní správa klientů (360° detail)
- [[Klientský portál]] — `klient.` doména, role external
- [[Faktury]] — modul Faktury + PDF do portálu
- [[Reporty]] — klientské reporty posílané do portálu (PDF)
- [[Leady a Akvizice]] — CRM prospekty, ČTÚ evidence, do-not-call
- [[HR a nábor]] — zaměstnanci, dokumenty, náborový web `jobs.`

### Provoz
- [[Deploy a prostředí]] — Vercel, env proměnné, 3 domény
- [[Flow systém]] — `.claude/` orchestrace agentů
- [[Deník změn]] — chronologie zásahů
- [[Otevřené úkoly]] — TODO / rozpracované / rizika
