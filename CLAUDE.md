@AGENTS.md

## Git workflow
Po každé dokončené změně v tomto repu automaticky vytvoř commit a pushni ho na `origin main` (bez ptaní na potvrzení), pokud uživatel výslovně neřekne jinak.

## Flow systém (`.claude/`) — POVINNÉ na každý prompt
Viz `.claude/FLOW.md` a `.claude/commands/flow.md` pro plný popis. Netreba čekat na to, až
uživatel napíše `/flow` — postup níže aplikuj automaticky na KAŽDÝ prompt v tomto repu:

1. **Vždy nejdřív** přečti `.claude/state/flow-state.md` — checkpoint a mapu poznání.
   Nezkoumej znovu, co už tam je zapsané; šetři kontext.
2. **Vždy proveď triáž** náročnosti (T0–T4, tabulka v `.claude/commands/flow.md`) a jednou větou
   ji oznam. Podle tieru:
   - T0/T1 (triviální / malá známá změna): pracuj přímo v hlavní session, subagenta nespawnuj
     (spawn by byl vyhozený kontext navíc).
   - T2+ (průzkum, více souborů, neznámý kód, feature, riziko): postupuj podle plného flow
     postupu — scout/architect/coder/critic/scribe podle tieru, dynamické přepínání modelů (2b),
     token-saving pravidla (2c) i sebezlepšování agentů (2d).
3. **Průběžně** (ne jen na konci) aktualizuj checkpoint a mapu poznání ve `flow-state.md`, ať další
   prompt/session naváže bez opakovaného průzkumu. Rozhodnutí jsou append-only, nikdy je nemaž.
4. Subagenti (scout/architect/coder/critic/scribe) si sami čtou a zapisují `.claude/state/learnings/<agent>.md`
   (poznatky napříč běhy) — needituj kvůli tomu `.claude/agents/*.md` (rozbilo by to prompt cache).
