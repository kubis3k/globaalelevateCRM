@AGENTS.md

## Git workflow
Po každé dokončené změně v tomto repu automaticky vytvoř commit a pushni ho na `origin main` (bez ptaní na potvrzení), pokud uživatel výslovně neřekne jinak.

## Flow systém (`.claude/`)
Viz `.claude/FLOW.md` pro plný popis. Klíčové body pro KAŽDOU session (i mimo `/flow`):
- Na začátku netriviálního úkolu přečti `.claude/state/flow-state.md` — checkpoint a mapu poznání.
  Nezkoumej znovu, co už tam je zapsané; šetři kontext.
- U úkolů T2+ (více souborů, průzkum, neznámý kód) zvaž `/flow <úkol>` místo přímé práce —
  triáž a přiřazení modelů viz `.claude/commands/flow.md`.
- Průběžně (ne jen na konci) aktualizuj checkpoint a mapu poznání ve `flow-state.md`, ať další
  prompt/session naváže bez opakovaného průzkumu. Rozhodnutí jsou append-only, nikdy je nemaž.
- Subagenti (scout/architect/coder/critic/scribe) si sami čtou a zapisují `.claude/state/learnings/<agent>.md`
  (poznatky napříč běhy) — needituj kvůli tomu `.claude/agents/*.md` (rozbilo by to prompt cache).
