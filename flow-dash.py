#!/usr/bin/env python3
"""
FLOW DASH — lehký lokální dashboard nad .claude/state/token-log/

Spuštění z kořene projektu:  python3 flow-dash.py   →  http://localhost:8377
Stdlib only, žádné závislosti (Chart.js se načítá z CDN).

Ceny uprav podle aktuálního ceníku Anthropic (USD za 1M tokenů):
https://claude.com/pricing
"""

import json
import os
import glob
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8377
LOG_DIR = os.path.join(".claude", "state", "token-log")

# === UPRAV PODLE AKTUÁLNÍHO CENÍKU (USD / 1M tokenů) =========================
# Klíč = podřetězec názvu modelu z transkriptu (match case-insensitive).
# cache_read je typicky ~10 % ceny inputu, cache_write ~125 %.
PRICES = {
    "opus":   {"input": 15.0, "output": 75.0, "cache_read": 1.50, "cache_write": 18.75},
    "sonnet": {"input": 3.0,  "output": 15.0, "cache_read": 0.30, "cache_write": 3.75},
    "haiku":  {"input": 1.0,  "output": 5.0,  "cache_read": 0.10, "cache_write": 1.25},
}
DEFAULT_PRICE = PRICES["sonnet"]
# =============================================================================


def price_for(model):
    m = model.lower()
    for key, p in PRICES.items():
        if key in m:
            return p
    return DEFAULT_PRICE


def cost_usd(model, u):
    p = price_for(model)
    return (
        u.get("input", 0) * p["input"]
        + u.get("output", 0) * p["output"]
        + u.get("cache_read", 0) * p["cache_read"]
        + u.get("cache_write", 0) * p["cache_write"]
    ) / 1_000_000


def load_data():
    sessions = []
    for path in sorted(glob.glob(os.path.join(LOG_DIR, "*.json"))):
        try:
            with open(path, encoding="utf-8") as f:
                sessions.append(json.load(f))
        except (OSError, json.JSONDecodeError):
            continue

    prompts, warnings = [], []
    for s in sessions:
        if s.get("warning"):
            warnings.append(s["warning"])
        for p in s.get("prompts", []):
            total = {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0}
            cost = 0.0
            for model, u in p.get("models", {}).items():
                for k in total:
                    total[k] += u.get(k, 0)
                cost += cost_usd(model, u)
            ctx_total = total["input"] + total["cache_read"] + total["cache_write"]
            prompts.append({
                "ts": p.get("ts"),
                "session": s.get("session_id", "")[:8],
                "prompt": p.get("prompt", ""),
                "is_flow": p.get("is_flow", False),
                "tier": p.get("tier"),
                "models": p.get("models", {}),
                "total": total,
                "cost": round(cost, 4),
                "cache_hit_pct": round(100 * total["cache_read"] / ctx_total, 1) if ctx_total else 0,
                "sub_share_pct": round(
                    100 * sum(p.get("subagents", {}).values())
                    / max(1, sum(p.get("subagents", {}).values()) + sum(p.get("main", {}).values())), 1),
            })
    prompts.sort(key=lambda x: x.get("ts") or "")
    return {"prompts": prompts, "warnings": sorted(set(warnings))}


HTML = """<!DOCTYPE html>
<html lang="cs"><head><meta charset="utf-8">
<title>FLOW DASH</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
  :root{--bg:#0e1116;--card:#161b24;--txt:#dbe2ee;--mut:#7d8aa0;--acc:#e8833a;--ok:#3fb47f;--warn:#e05555;--line:#232b38}
  *{box-sizing:border-box;margin:0}
  body{background:var(--bg);color:var(--txt);font:14px/1.5 -apple-system,'Segoe UI',Roboto,sans-serif;padding:24px;max-width:1200px;margin:auto}
  h1{font-size:20px;letter-spacing:.06em;margin-bottom:2px}
  h1 span{color:var(--acc)}
  .sub{color:var(--mut);font-size:12px;margin-bottom:20px}
  .warn{background:#3a1d1d;border:1px solid var(--warn);color:#f2b4b4;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:13px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
  .kpi b{display:block;font-size:22px;margin-top:2px}
  .kpi small{color:var(--mut);text-transform:uppercase;letter-spacing:.08em;font-size:10px}
  .row{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}
  .card h3{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{color:var(--mut);text-align:left;font-weight:500;padding:6px 8px;border-bottom:1px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  tr:hover td{background:#1b2230}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .tag{display:inline-block;padding:1px 7px;border-radius:20px;font-size:11px;background:#26303f}
  .tag.flow{background:#2a3a2f;color:var(--ok)}
  .tag.tier{background:#3a2f26;color:var(--acc)}
  .prompt-txt{color:var(--mut);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  canvas{max-height:260px}
  @media(max-width:800px){.row{grid-template-columns:1fr}}
</style></head><body>
<h1>FLOW <span>DASH</span></h1>
<div class="sub">tokeny &amp; náklady per prompt · lokální data z .claude/state/token-log · ceny nastavíš ve flow-dash.py</div>
<div id="warnings"></div>
<div class="kpis" id="kpis"></div>
<div class="row">
  <div class="card"><h3>Náklady per prompt (USD)</h3><canvas id="chCost"></canvas></div>
  <div class="card"><h3>Tokeny podle modelu</h3><canvas id="chModels"></canvas></div>
</div>
<div class="card"><h3>Prompty (nejnovější nahoře)</h3>
<table><thead><tr>
  <th>čas</th><th>prompt</th><th></th>
  <th class="num">input</th><th class="num">cache read</th><th class="num">output</th>
  <th class="num">cache hit</th><th class="num">subagenti</th><th class="num">$ odhad</th>
</tr></thead><tbody id="rows"></tbody></table></div>
<script>
const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(1)+'k':n;
fetch('/data').then(r=>r.json()).then(d=>{
  const P=d.prompts;
  document.getElementById('warnings').innerHTML=d.warnings.map(w=>`<div class="warn">⚠ ${w}</div>`).join('');
  const sum=k=>P.reduce((a,p)=>a+p.total[k],0);
  const totCost=P.reduce((a,p)=>a+p.cost,0);
  const flowP=P.filter(p=>p.is_flow), plainP=P.filter(p=>!p.is_flow);
  const avg=a=>a.length?a.reduce((x,p)=>x+p.cost,0)/a.length:0;
  const ctx=sum('input')+sum('cache_read')+sum('cache_write');
  const kpis=[
    ['prompty',P.length],
    ['celkem $',totCost.toFixed(2)],
    ['Ø $ / flow prompt',avg(flowP).toFixed(3)],
    ['Ø $ / běžný prompt',avg(plainP).toFixed(3)],
    ['cache hit rate',ctx?(100*sum('cache_read')/ctx).toFixed(0)+'%':'—'],
    ['output tokenů',fmt(sum('output'))]
  ];
  document.getElementById('kpis').innerHTML=kpis.map(([l,v])=>`<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('');

  new Chart(chCost,{type:'bar',data:{labels:P.map((p,i)=>i+1),
    datasets:[{label:'$ / prompt',data:P.map(p=>p.cost),
      backgroundColor:P.map(p=>p.is_flow?'#3fb47f':'#e8833a')}]},
    options:{plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#7d8aa0'}},y:{ticks:{color:'#7d8aa0'}}}}});

  const byModel={};
  P.forEach(p=>Object.entries(p.models).forEach(([m,u])=>{
    byModel[m]=(byModel[m]||0)+u.input+u.output+u.cache_read+u.cache_write}));
  new Chart(chModels,{type:'doughnut',data:{labels:Object.keys(byModel),
    datasets:[{data:Object.values(byModel),
      backgroundColor:['#e8833a','#3fb47f','#5b8dd9','#c75b9b','#d9c65b']}]},
    options:{plugins:{legend:{position:'bottom',labels:{color:'#dbe2ee',boxWidth:12}}}}});

  document.getElementById('rows').innerHTML=[...P].reverse().map(p=>`<tr>
    <td>${p.ts?p.ts.slice(5,16).replace('T',' '):'—'}</td>
    <td class="prompt-txt" title="${(p.prompt||'').replace(/"/g,'&quot;')}">${p.prompt||''}</td>
    <td>${p.is_flow?'<span class="tag flow">flow</span>':''}${p.tier?` <span class="tag tier">${p.tier}</span>`:''}</td>
    <td class="num">${fmt(p.total.input)}</td>
    <td class="num">${fmt(p.total.cache_read)}</td>
    <td class="num">${fmt(p.total.output)}</td>
    <td class="num">${p.cache_hit_pct}%</td>
    <td class="num">${p.sub_share_pct}%</td>
    <td class="num">$${p.cost.toFixed(3)}</td></tr>`).join('');
});
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/data":
            body = json.dumps(load_data()).encode()
            ctype = "application/json"
        else:
            body = HTML.encode()
            ctype = "text/html; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    if not os.path.isdir(LOG_DIR):
        print(f"Pozor: {LOG_DIR} neexistuje — nejdřív proběhne nějaký prompt s aktivním hookem.")
    print(f"FLOW DASH → http://localhost:{PORT}  (Ctrl+C pro konec)")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
