# FLOW SYSTEM — orchestrace subagentů

> Tento blok vlož do CLAUDE.md projektu (nebo nech tento soubor jako CLAUDE.md,
> pokud projekt žádný nemá).

## Kdy se aktivuje
- Explicitně: příkaz `/flow <úkol>`.
- Automaticky: u úkolů, které zjevně spadají do T2+ (viz triáž níže), navrhni
  uživateli spuštění flow režimu.

## Zlaté pravidlo tokenů
Nejlevnější subagent je ten, který se nespawnul. Spawn má smysl jen když:
1. úloha zaplní hlavní kontext balastem (průzkum mnoha souborů), NEBO
2. úlohu zvládne levnější model (routing na haiku), NEBO
3. potřebuješ čistý pohled (review bez zatížení kontextem implementace).
Jinak pracuj v hlavní session.

## Triáž náročnosti → tým a modely
| Tier | Úloha | Tým | Modely |
|------|-------|-----|--------|
| T0 | trivialita, 1 soubor | nikdo (main) | — |
| T1 | malá změna, známý kód | coder (+critic u rizika) | sonnet (+sonnet) |
| T2 | více souborů / průzkum | scout → coder → critic | haiku → sonnet → sonnet |
| T3 | feature / neznámý kód | scout → architect → coder → critic → scribe | haiku → opus → sonnet → sonnet → haiku |
| T4 | jádro / bezpečnost / migrace | jako T3, ale architect schvaluje plán před kódem a review běží na opus | opus-heavy |

Mozek smí tier přehodnotit za běhu (eskalace T1→T2 když se ukáže složitost),
ale vždy to oznámí jednou větou.

## Protokol sdílené paměti
- Jediný zdroj pravdy: `.claude/state/flow-state.md` (šablona v /flow příkazu).
- Každý agent na začátku ČTE stav, na konci vrací blok k zápisu; zápis dělá
  mozek nebo scribe (ne každý agent sám → žádné konflikty).
- Checkpoint (soubor + řádek + další krok) se aktualizuje po KAŽDÉM běhu.
  Díky němu nový prompt navazuje bez opakovaného průzkumu.
- Scribe drží stav pod 150 řádky — dlouhá paměť je drahá paměť.

## Komunikace agentů
Subagenti spolu nemluví přímo (limit Claude Code) — "komunikují" přes
flow-state.md a přes mozek. Mozek předává mezi agenty jen kondenzované
výstupy, nikdy surové transkripty.

## Effort / thinking
Subagenti dědí extended thinking z hlavní session (nejde nastavit per agent).
Praktické řízení effortu:
- T0–T2: thinking vypnutý / normální session.
- T3–T4: zapni thinking v hlavní session před `/flow` (např. slovem "think hard"
  v promptu) — zdědí ho architect i critic.

---

# MĚŘENÍ TOKENŮ A DASHBOARD

## Jak to funguje
1. `.claude/settings.json` registruje Stop + SubagentStop hook →
   `token_tracker.py` po každé odpovědi přečte transkript session a zapíše
   agregát per prompt do `.claude/state/token-log/<session>.json`
   (input / output / cache read / cache write, rozpad podle modelu,
   podíl subagentů, detekce /flow a tieru).
2. Dashboard: `python3 flow-dash.py` z kořene projektu → http://localhost:8377
   - $ per prompt (flow prompty zeleně vs. běžné oranžově)
   - Ø cena flow vs. běžný prompt — hlavní metrika, jestli se ti flow vyplácí
   - cache hit rate, rozpad tokenů podle modelu, podíl subagentů
   - ceny modelů uprav v PRICES nahoře ve flow-dash.py podle aktuálního ceníku

## Smyčka vylepšování (datuj a uč se)
Po týdnu používání se podívej na:
- Ø $ flow vs. Ø $ běžný prompt → pokud flow nevychází levněji/hodnotněji
  na velkých úkolech, zpřísni triáž (víc úkolů do T0/T1).
- cache hit rate < 60 % → něco churnuje kontext (měnící se agent prompty,
  bobtnající flow-state) → zpřísni scribe limit.
- vysoký podíl subagentů u malých promptů → mozek spawnuje zbytečně.

## Garance dynamického přepínání modelů
- Modely: frontmatter (default) → per-invocation override mozkem (sekce 2b
  v /flow). Hook automaticky VARUJE, pokud je nastavená env proměnná
  CLAUDE_CODE_SUBAGENT_MODEL, která by dynamiku vypnula.
- Upgrade path pro velké měření: nativní OpenTelemetry export
  (CLAUDE_CODE_ENABLE_TELEMETRY=1 + Grafana/SigNoz) — až lokální dashboard
  přestane stačit.

---

# INSTALACE

1. Zkopíruj složku `.claude/` + `flow-dash.py` do kořene projektu:
   - `.claude/commands/flow.md` — trigger `/flow`
   - `.claude/agents/{scout,architect,coder,critic,scribe}.md` — tým
   - `.claude/state/` — sem se zapíše flow-state.md při prvním běhu
2. Tento soubor (sekce nad čarou) vlož do `CLAUDE.md` projektu.
3. Volitelně: per-agent persistentní paměť už je zapnutá (`memory: project`
   ve frontmatter) — Claude Code ji ukládá do `.claude/agent-memory/`.
4. První použití: `claude` → `/flow <zadání>`.

## Ladění
- Agenti se nespouštějí automaticky → zpřesni `description` (trigger je řízen
  čistě popisem, žádné jiné pole neexistuje).
- Moc drahé běhy → zkontroluj, že mozek nespawnuje tým na T0/T1 úlohy; případně
  zpřísni triáž v `commands/flow.md`.
- Stav bobtná → sniž limit scribea ze 150 na 100 řádků.

---

# SEBEZLEPŠOVÁNÍ AGENTŮ (úprava pro tento projekt)

Nad rámec originálu tento projekt navíc používá explicitní, git-verzovanou
paměť per agent — `.claude/state/learnings/<agent>.md` — vedle vestavěné
opaque `memory: project` funkce Claude Code (`.claude/agent-memory/`, viz
Instalace bod 3). Důvod: `learnings/*.md` je čitelné, přenositelné mezi stroji
přes git a scribe ho aktivně prořezává — je to viditelná, kontrolovatelná
paměť, ne černá skříňka.

Smyčka:
1. Každý agent (scout/architect/coder/critic/scribe) si na začátku běhu
   přečte vlastní `learnings/<agent>.md` a aplikuje, co tam je.
2. Pokud během práce objeví obecně platný poznatek (ne jednorázovou specifiku
   úkolu), přidá do výstupu `## POZNATEK` (1 řádek, jinak sekci vynechá).
3. `scribe` po běhu tyto řádky přelije do příslušných `learnings/*.md`
   (dedupe, tvrdý limit 40 řádků/soubor, prořezává nejstarší/nejméně obecné).
4. Definice agentů v `.claude/agents/*.md` se za běhu NEMĚNÍ (kvůli prompt
   cache) — mění se jen jejich poznámkové soubory ve `state/learnings/`.

Efekt: scout příště nehledá stejnou slepou uličku, coder neopakuje stejnou
chybu, critic cíleně kontroluje známé rizikové vzorce — bez nutnosti cokoli
předávat přes mozka.
