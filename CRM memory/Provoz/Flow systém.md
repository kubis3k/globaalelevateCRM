---
tags: [provoz, flow, agenti]
updated: 2026-09-05
---

# 🔄 Flow systém (`.claude/`)

Orchestrace agentů pro práci na repu. Aplikuje se **automaticky na každý prompt** (viz `CLAUDE.md`), netřeba psát `/flow`.

## Postup
1. **Vždy nejdřív** přečti `.claude/state/flow-state.md` — checkpoint + mapa poznání (nezkoumej znovu, co tam je).
2. **Triáž** náročnosti T0–T4 (tabulka v `.claude/commands/flow.md`), oznam jednou větou:
   - T0/T1 (triviální/malá známá změna) → přímo v hlavní session, bez subagenta.
   - T2+ (průzkum, víc souborů, neznámý kód, feature, riziko) → plný flow: scout/architect/coder/critic/scribe podle tieru.
3. **Průběžně** aktualizuj `flow-state.md` (checkpoint + mapa). Rozhodnutí append-only, nikdy nemaž.
4. Subagenti si čtou/zapisují `.claude/state/learnings/<agent>.md` (poznatky napříč běhy) — kvůli tomu needituj `.claude/agents/*.md` (rozbil by se prompt cache).

## Situační agenti (flow-system-v2, přizpůsobeno globaalCRM)
- **security-guardian** (opus, read-only) — bezpečnostní review citlivých domén: multi-tenant izolace, auth/role, portál klient-data (IDOR), finance, GDPR/ČTÚ leady. Trigger podle oblasti diffu, ne tieru.
- **ux-reviewer** (sonnet) — UI review: přístupnost, mobile-first (portál/nábor), chybové/prázdné stavy, konzistence s design systémem.
- token_tracker.py v2 — rozpad nákladů per-agent (lokální, nic neodesílá).

## Vztah k vaultu
- `flow-state.md` = strojový checkpoint pro orchestraci (v repu, `.claude/state/`).
- **Tento vault** = lidsky čitelná dokumentace projektu. Souběžné, komplementární.

Souvisí: [[00 Index]] · [[Deník změn]]
