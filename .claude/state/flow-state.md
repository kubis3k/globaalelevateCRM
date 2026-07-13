# FLOW STATE
## Aktuální úkol
- cíl: nasadit flow systém (subagenti + sdílená paměť + token dashboard) do repa a rozšířit ho o sebezlepšování agentů
- tier: T2
- status: done

## Kde jsme skončili (checkpoint)
- poslední dokončený krok: rozbalen flow-system.zip do `.claude/`, agenti (scout/architect/coder/critic/scribe)
  rozšířeni o krok 0 "přečti learnings/<agent>.md" a výstupní sekci "## POZNATEK"; scribe rozšířen o
  přelévání POZNATEK řádků do `.claude/state/learnings/*.md` (dedupe, limit 40 řádků); flow.md doplněn o sekci 2d;
  originální README zipu zachováno jako `.claude/FLOW.md` (projektový README.md nepřepsán)
- rozpracovaný soubor + řádek: žádný — commit a push proběhly
- další krok: až přijde další netriviální úkol, zvážit `/flow <úkol>` místo přímé práce v main session

## Mapa poznání (co víme o codebase)
- src/app/(dashboard)/events/: modul AKCE (produkční hub) — events, event_lineup, event_timeline, vip_reservations, guest_list, event_budget_items
- src/app/(dashboard)/events/actions.ts: server actions pro AKCE (saveEvent, saveBudgetItem/importBudgetItems, saveGuest/setGuestFlag, ...) — vzor: `getCtx()` na tenant+role, `canManageEvents(role)` gate, admin (service-role) klient na zápisy
- supabase/migrations/: idempotentní SQL migrace, RLS = "tenant read" + "admin manage" pattern
- .claude/agents/*.md: definice se za běhu NEMĚNÍ (prompt cache) — self-improvement jde přes `.claude/state/learnings/<agent>.md`, ne přes editaci agentů
- node/npm/vercel CLI nejsou v tomto shellu dostupné — build/dev/deploy nelze ověřit lokálně z téhle session

## Rozhodnutí (append-only)
- [2026-07-13] Zip README (obsahoval instrukce k vložení do CLAUDE.md) NEpřepsal projektový README.md — uložen zvlášť jako `.claude/FLOW.md`, aby se nesmazala existující Next.js dokumentace.
- [2026-07-13] Sebezlepšování agentů řešeno explicitními git-verzovanými soubory `.claude/state/learnings/<agent>.md` (čitelné, prořezatelné scribem) vedle vestavěné opaque `memory: project` funkce Claude Code — ne náhradou, ale doplňkem.
- [2026-07-13] Guest list (modul AKCE) rozšířen o odškrtávací příznaky is_vip / is_permanent vedle existujícího typu (guest/press/artist/staff/promoter); rozpočet akce nově má řádkové položky `event_budget_items` importovatelné z Excelu (knihovna `xlsx`, parsování v prohlížeči, server action nahradí celý rozpočet akce).

## Otevřené otázky / blokery
- Vercel deploy nelze z tohoto shellu ověřit (chybí node/npm/vercel CLI i browser OAuth) — buď má repo už GitHub→Vercel auto-deploy, nebo to musí uživatel propojit sám na vercel.com.
