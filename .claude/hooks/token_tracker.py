#!/usr/bin/env python3
"""
FLOW token tracker (v2) — Stop + SubagentStop hook pro Claude Code.

Po každé odpovědi (hlavní i subagentní) přečte transkript session, agreguje spotřebu tokenů
per USER PROMPT a zapíše výsledek do .claude/state/token-log/<session_id>.json.

CO JE NOVÉHO OPROTI v1:
- Rozpad spotřeby PER AGENT (scout/coder/critic/architect/scribe/payments-guardian/...), ne jen
  binárně main vs. subagents. Bez tohohle nejde zjistit, jestli tě žere architect na opusu, nebo
  scribe na haiku — a to byl důvod, proč tenhle dashboard vůbec existuje.
- Používá k tomu `agent_id` / `agent_type` / `agent_transcript_path` z hook payloadu, které
  Claude Code posílá při SubagentStop. Tahle tři pole jsou POTVRZENÁ v aktuální (2026) oficiální
  dokumentaci Agent SDK hooks (code.claude.com/docs/en/agent-sdk/hooks) — `agent_transcript_path`
  je cesta k VLASTNÍMU transkriptu daného subagenta, takže není potřeba nic hádat ani parsovat
  ze sdíleného hlavního transkriptu.
- POKUD tvoje verze Claude Code tahle pole (ještě) neposílá: kód to potichu detekuje a spadne
  zpátky na starý main/subagents rozpad. Nikdy nespadne, jen bude mít dashboard méně detailu.

PROČ SIDECAR SOUBOR (<session>.agents.json):
Hlavní prompts[] pole se pořád přepočítává z transkriptu OD NULY při každém běhu (idempotentní,
žádné offsety, žádné race conditions — stejně jako v1). Per-agent rozpad ale musí PERSISTOVAT
mezi jednotlivými voláními hooku, protože `agent_transcript_path` konkrétního subagenta je
k dispozici jen v okamžiku, kdy TEN subagent skončí — o pár volání později už to nejde zjistit
zpětně z hlavního transkriptu. Sidecar je proto jediná část tohohle skriptu, která NENÍ čistě
idempotentní přepočet — je to malý akumulátor, co se resetuje při každém finálním Stop (konec
kola), aby se rozpad nepřenášel do dalšího, nesouvisejícího promptu.

ZNÁMÉ LIMITY (ať nikdo nečeká víc, než tenhle skript reálně umí):
- Přiřazení per-agent rozpadu k "aktuálnímu" promptu je poziční (poslední prompt v poli), stejně
  jako přiřazení tieru v current_tier(). U souběžných paralelních subagentů v jednom běhu by
  teoreticky mohlo dojít k mírnému zkreslení pořadí zápisu — nejde o ztrátu dat (sidecar sčítá
  všechno správně), jen o to, ke kterému řádku v dashboardu se to zobrazí.
- transcript_path se podle oficiální dokumentace zapisuje asynchronně a může při čtení chvíli
  zaostávat za posledními zprávami aktuálního kola — dashboard tak může u posledního promptu
  v běhu mírně podhodnotit tokeny. Není to bug tohohle skriptu, je to zdokumentované chování CC.

Stdlib only. Registrace: .claude/settings.json (hooks.Stop, hooks.SubagentStop).
"""

import json
import os
import sys
import re
from datetime import datetime, timezone

LOG_DIR = os.path.join(".claude", "state", "token-log")
FLOW_STATE = os.path.join(".claude", "state", "flow-state.md")
PROMPT_PREVIEW_LEN = 100

USAGE_FIELDS = ("input", "cache_write", "cache_read", "output")


def read_stdin_payload():
    try:
        return json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        return {}


def current_tier():
    """Best-effort: vytáhne aktuální tier z flow-state.md."""
    try:
        with open(FLOW_STATE, encoding="utf-8") as f:
            m = re.search(r"tier:\s*(T\d)", f.read(), re.IGNORECASE)
            return m.group(1).upper() if m else None
    except OSError:
        return None


def extract_text(content):
    """message.content může být string nebo list bloků."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return " ".join(parts)
    return ""


def is_real_user_prompt(entry):
    """User zpráva, která NENÍ tool_result a NENÍ sidechain (subagent)."""
    if entry.get("type") != "user" or entry.get("isSidechain"):
        return False
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, list):
        if any(isinstance(b, dict) and b.get("type") == "tool_result" for b in content):
            return False
    text = extract_text(content).strip()
    return bool(text)


def new_prompt_record(entry):
    text = extract_text((entry.get("message") or {}).get("content")).strip()
    return {
        "ts": entry.get("timestamp"),
        "prompt": text[:PROMPT_PREVIEW_LEN],
        "is_flow": text.startswith("/flow") or "FLOW MODE" in text,
        "tier": None,  # doplní se na konci z flow-state (best-effort)
        "models": {},  # model -> {input, cache_write, cache_read, output, calls}
        "main": {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0},
        "subagents": {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0},
        "by_agent": {},  # agent_type -> {model -> usage}  (jen pokud CC posílá agent_transcript_path)
    }


def empty_usage():
    return {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0, "calls": 0}


def add_usage_dict(bucket, usage):
    for k in USAGE_FIELDS:
        bucket[k] += usage.get(k, 0)
    bucket["calls"] += 1


def add_usage(record, entry):
    msg = entry.get("message") or {}
    usage = msg.get("usage")
    if not usage:
        return
    model = msg.get("model", "unknown")
    u = {
        "input": usage.get("input_tokens", 0) or 0,
        "cache_write": usage.get("cache_creation_input_tokens", 0) or 0,
        "cache_read": usage.get("cache_read_input_tokens", 0) or 0,
        "output": usage.get("output_tokens", 0) or 0,
    }
    bucket = record["models"].setdefault(model, empty_usage())
    add_usage_dict(bucket, u)

    side = "subagents" if entry.get("isSidechain") else "main"
    for k in USAGE_FIELDS:
        record[side][k] += u[k]


def parse_transcript(path):
    prompts = []
    current = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if is_real_user_prompt(entry):
                current = new_prompt_record(entry)
                prompts.append(current)
            elif entry.get("type") == "assistant" and current is not None:
                add_usage(current, entry)
    return prompts


def parse_agent_transcript(path):
    """Sečte token usage pro JEDEN subagentí transkript (agent_transcript_path z hook payloadu).
    Vrací dict {model: {input, cache_write, cache_read, output, calls}}. Prázdný dict = žádná
    data / soubor neexistuje / pole není podporované touhle verzí Claude Code — volající to musí
    umět v klidu ignorovat."""
    models = {}
    if not path or not os.path.isfile(path):
        return models
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if entry.get("type") != "assistant":
                    continue
                msg = entry.get("message") or {}
                usage = msg.get("usage")
                if not usage:
                    continue
                model = msg.get("model", "unknown")
                u = {
                    "input": usage.get("input_tokens", 0) or 0,
                    "cache_write": usage.get("cache_creation_input_tokens", 0) or 0,
                    "cache_read": usage.get("cache_read_input_tokens", 0) or 0,
                    "output": usage.get("output_tokens", 0) or 0,
                }
                bucket = models.setdefault(model, empty_usage())
                add_usage_dict(bucket, u)
    except OSError:
        return {}
    return models


def merge_models(dst, src):
    for model, u in src.items():
        bucket = dst.setdefault(model, empty_usage())
        for k in USAGE_FIELDS:
            bucket[k] += u.get(k, 0)
        bucket["calls"] += u.get("calls", 0)


def agents_sidecar_path(session_id):
    return os.path.join(LOG_DIR, f"{session_id}.agents.json")


def load_sidecar(session_id):
    path = agents_sidecar_path(session_id)
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("current", {})
            return data
    except (OSError, json.JSONDecodeError):
        return {"current": {}}


def save_sidecar(session_id, data):
    os.makedirs(LOG_DIR, exist_ok=True)
    path = agents_sidecar_path(session_id)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)


def main():
    payload = read_stdin_payload()
    transcript = payload.get("transcript_path")
    session_id = payload.get("session_id", "unknown")
    if not transcript or not os.path.isfile(transcript):
        sys.exit(0)  # nikdy neblokovat Claude Code

    agent_type = payload.get("agent_type")  # přítomné jen na SubagentStop (a novějších CC verzích)
    agent_transcript = payload.get("agent_transcript_path")

    sidecar = load_sidecar(session_id)
    is_subagent_event = bool(agent_type)

    if is_subagent_event:
        agent_models = parse_agent_transcript(agent_transcript)
        if agent_models:
            bucket = sidecar["current"].setdefault(agent_type, {})
            merge_models(bucket, agent_models)
            save_sidecar(session_id, sidecar)
        # jinak: starší CC bez agent_transcript_path — potichu přeskoč, hlavní main/subagents
        # rozpad níže funguje beze změny.

    prompts = parse_transcript(transcript)
    tier = current_tier()
    if prompts and tier:
        prompts[-1]["tier"] = tier  # tier platí pro poslední (právě dokončený/probíhající) prompt

    if prompts and sidecar.get("current"):
        # připoj (možná ještě neúplný, pokud kolo běží dál) per-agent rozpad k poslední výzvě
        prompts[-1]["by_agent"] = sidecar["current"]

    # Sanity check: env proměnná, která by přebila dynamické přepínání modelů
    warning = None
    if os.environ.get("CLAUDE_CODE_SUBAGENT_MODEL"):
        warning = (
            "CLAUDE_CODE_SUBAGENT_MODEL je nastavená — přebíjí per-invocation "
            "i frontmatter modely a VYPÍNÁ dynamické přepínání. Odnastav ji."
        )

    os.makedirs(LOG_DIR, exist_ok=True)
    out = {
        "session_id": session_id,
        "updated": datetime.now(timezone.utc).isoformat(),
        "warning": warning,
        "prompts": prompts,
    }
    tmp = os.path.join(LOG_DIR, f"{session_id}.json.tmp")
    dst = os.path.join(LOG_DIR, f"{session_id}.json")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    os.replace(tmp, dst)

    if not is_subagent_event:
        # Stop = konec celého kola (main odpověď dokončena) → vynuluj akumulátor pro příští kolo,
        # ať se per-agent rozpad z tohohle běhu nepřilepí na nesouvisející budoucí prompt.
        save_sidecar(session_id, {"current": {}})

    if warning:
        print(f"[flow-tracker] VAROVÁNÍ: {warning}", file=sys.stderr)

    sys.exit(0)


if __name__ == "__main__":
    main()
