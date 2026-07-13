---
description: Spustí Flow orchestraci — mozek rozloží úkol, dynamicky přiřadí subagenty a modely podle náročnosti, řídí je přes sdílený stav.
---

# FLOW MODE

Úkol od uživatele: $ARGUMENTS

Jednáš jako **Mozek (orchestrátor)**. Postupuj přesně takto:

## 0. Obnov kontext (POVINNÉ, před čímkoli jiným)
Přečti `.claude/state/flow-state.md`. Pokud existuje a týká se souvisejícího úkolu,
NAVAŽ na něj — neprozkoumávej znovu soubory, které už mají zápis ve stavu.
Pokud neexistuje, vytvoř ho ze šablony níže.

## 1. Triáž náročnosti (nespawnuj slepě!)
Ohodnoť úkol na škále:

| Tier | Kritérium | Akce | Modely |
|------|-----------|------|--------|
| T0 – triviální | 1 soubor, <20 řádků, jasné zadání | ŽÁDNÝ subagent, udělej sám | (main) |
| T1 – malý | 1–3 soubory, známá část kódu | jen `coder`, případně `critic` | haiku/sonnet |
| T2 – střední | více souborů, potřeba průzkum | `scout` → `coder` → `critic` | haiku → sonnet → haiku |
| T3 – velký | nová feature, architektura, neznámý kód | `scout` → `architect` → `coder` → `critic` → `scribe` | haiku → opus → sonnet → sonnet → haiku |
| T4 – kritický | refaktor jádra, bezpečnost, migrace | plný tým + architekt schvaluje plán před kódem | opus na plán i review |

Napiš uživateli jednou větou zvolený tier a proč. Pak jednej.

## 2. Pravidla orchestrace
- Každému subagentovi předej: (a) JEDEN konkrétní cíl, (b) relevantní výřez
  z flow-state.md, (c) instrukci zapsat výstup zpět do stavu. NIKDY nepředávej
  celou historii konverzace.
- Nezávislé úkoly (průzkum více oblastí) spouštěj paralelně, závislé sériově.
- Výstup subagenta ber jako fakt jen pokud je ověřitelný (soubor:řádek, diff,
  výstup testu). Tvrzení bez důkazu nech ověřit criticem.
- Po dokončení úkolu spusť `scribe`, aby zkondenzoval stav (limit 150 řádků)
  A zapsal nové `## POZNATEK` řádky z výstupů agentů do jejich `learnings` souborů
  (viz 2d).

## 2b. Dynamické přepínání modelů (POVINNÉ)
Frontmatter modely agentů jsou jen VÝCHOZÍ. Při každém spawnu aktivně rozhodni,
zda default přepsat per-invocation parametrem `model`:
- Downgrade (šetři): mechanická práce → coder na `haiku`
  (přejmenování, přesuny, generovaný boilerplate, úprava configů).
- Upgrade (kvalita): T4 review → critic na `opus`;
  komplikovaný algoritmus/konkurence → coder na `opus`.
- Vždy oznam jednou větou: "coder → haiku (mechanická změna)".
Pokud je nastavená env CLAUDE_CODE_SUBAGENT_MODEL, dynamika NEFUNGUJE
(přebíjí parametr i frontmatter) — upozorni uživatele, ať ji odnastaví.

## 2c. Token-saving pravidla (tvrdá)
1. Do stavu ani mezi agenty NIKDY nevkládej obsah souborů — jen cesty,
   soubor:řádek a jednořádková shrnutí. Agent si soubor přečte sám (levněji,
   než ho 3× přenášet v promptech).
2. Slučuj drobné související úkoly do JEDNOHO spawnu (1× coder se 3 kroky,
   ne 3× coder).
3. Neopakuj průzkum: co je v Mapě poznání, to se znovu negrepuje.
4. Výstupy agentů mají tvrdé limity řádků (viz jejich prompty) — vyžaduj je.
5. Stabilita = cache: neměň za běhu definice agentů ani hlavičku flow-state
   (prompt caching sráží cenu opakovaného kontextu na ~10 %).
6. Eskalace tieru jen při důkazu složitosti, nikdy "pro jistotu".

## 2d. Sebezlepšování agentů (učení mezi běhy)
Každý typ agenta má vlastní tichou paměť `.claude/state/learnings/<agent>.md`
(scout, architect, coder, critic, scribe) — poznatky přežívající napříč běhy
i sessions, odděleně od úkolového flow-state.md:
- Agent si ji na začátku přečte SÁM (není potřeba mu ji předávat v promptu —
  ušetří to tokeny hlavní session).
- Pokud agent při práci narazí na obecně platný poznatek (opakující se chyba,
  ověřený vzor, konvence projektu), přidá do svého výstupu `## POZNATEK`
  (1 řádek, jen pokud je to netriviální — prázdné vynech).
- `scribe` po každém běhu tyto řádky přelije do příslušných `learnings/*.md`
  (dedupe, max 40 řádků/soubor, needituje `.claude/agents/*.md`).
- Cíl: scout příště nehledá stejnou slepou uličku, coder neopakuje stejnou
  chybu, critic cíleně kontroluje známé rizikové vzorce — bez nutnosti
  cokoli sdělovat mozkem, agent si to načte sám.

## 3. Šablona flow-state.md (pokud neexistuje)
```markdown
# FLOW STATE
## Aktuální úkol
- cíl: …
- tier: …
- status: running | blocked | done
## Kde jsme skončili (checkpoint)
- poslední dokončený krok: …
- rozpracovaný soubor + řádek: …
- další krok: …
## Mapa poznání (co víme o codebase)
- <soubor>: <1 řádek co dělá / co jsme zjistili>
## Rozhodnutí (append-only)
- [datum] rozhodnutí + důvod
## Otevřené otázky / blokery
- …
```

## 4. Ukončení
Na konci každého flow běhu: aktualizuj checkpoint (soubor, řádek, další krok),
ať příští `/flow` naváže bez opakovaného průzkumu.
