#!/usr/bin/env python3
"""
FLOW token tracker — Stop hook pro Claude Code.

Po každé odpovědi přečte transkript session (JSONL), agreguje spotřebu tokenů
per USER PROMPT (včetně subagentů = sidechains) a zapíše výsledek do
.claude/state/token-log/<session_id>.json

Idempotentní: pokaždé přepočítá celou session a přepíše svůj soubor,
žádné offsety, žádné race conditions.

Stdlib only. Registrace: viz .claude/settings.json (hooks.Stop).
"""

import json
import os
import sys
import re
from datetime import datetime, timezone

LOG_DIR = os.path.join(".claude", "state", "token-log")
FLOW_STATE = os.path.join(".claude", "state", "flow-state.md")
PROMPT_PREVIEW_LEN = 100


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
    }


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
    bucket = record["models"].setdefault(
        model, {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0, "calls": 0}
    )
    for k, v in u.items():
        bucket[k] += v
    bucket["calls"] += 1

    side = "subagents" if entry.get("isSidechain") else "main"
    for k, v in u.items():
        record[side][k] += v


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


def main():
    payload = read_stdin_payload()
    transcript = payload.get("transcript_path")
    session_id = payload.get("session_id", "unknown")
    if not transcript or not os.path.isfile(transcript):
        sys.exit(0)  # nikdy neblokovat Claude Code

    prompts = parse_transcript(transcript)
    tier = current_tier()
    if prompts and tier:
        prompts[-1]["tier"] = tier  # tier platí pro poslední (právě dokončený) prompt

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

    if warning:
        # stderr se zobrazí uživateli v Claude Code
        print(f"[flow-tracker] VAROVÁNÍ: {warning}", file=sys.stderr)

    sys.exit(0)


if __name__ == "__main__":
    main()
