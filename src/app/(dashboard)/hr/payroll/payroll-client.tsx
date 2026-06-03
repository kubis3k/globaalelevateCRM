'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Lock, Unlock, Download, FileText, Settings2, Calculator, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { REGIME_LABEL } from '@/lib/payroll-cz'
import { createPayrollRun, savePayrollItem, lockPayrollRun, unlockPayrollRun, deletePayrollRun, savePayrollConfig } from '../actions'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const CONTRACTS: Record<string, string> = { hpp: 'HPP', dpp: 'DPP', dpc: 'DPČ', ico: 'IČO', other: 'Jiné' }
const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)

type Item = any
type Run = any

export function HrPayrollClient({ runs, config, defaults, year, isAdmin }: {
  runs: Run[]; config: any; defaults: any; year: number; isAdmin: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [cfgOpen, setCfgOpen] = useState(false)
  const [edit, setEdit] = useState<{ run: Run; item: Item } | null>(null)
  const [m, setM] = useState(new Date().getMonth() + 1)
  const [y, setY] = useState(year)

  function newRun() {
    startTransition(async () => { const r = await createPayrollRun(y, m); if (r?.error) toast.error('Chyba', r.error); else toast.success('Uzávěrka vytvořena') })
  }
  function lock(run: Run) {
    confirmDialog({ title: 'Uzamknout uzávěrku?', description: `${MONTHS[run.month - 1]} ${run.year} — po uzamčení nepůjde editovat (admin může odemknout).`, confirmLabel: 'Uzamknout' }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const r = await lockPayrollRun(run.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Uzamčeno') })
    })
  }
  function unlock(run: Run) { startTransition(async () => { const r = await unlockPayrollRun(run.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Odemčeno') }) }
  function removeRun(run: Run) {
    confirmDialog({ title: 'Smazat uzávěrku?', description: `${MONTHS[run.month - 1]} ${run.year} vč. všech řádků.`, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const r = await deletePayrollRun(run.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
    })
  }
  function exportCsv(run: Run) {
    const head = ['Zaměstnanec', 'Režim', 'Hrubá', 'SP zaměstnanec', 'ZP zaměstnanec', 'Daň', 'Čistá', 'SP zaměstnavatel', 'ZP zaměstnavatel', 'Náklad zaměstnavatele']
    const rows = run.items.map((i: Item) => [i.name, REGIME_LABEL[i.regime] || i.regime || '', i.gross, i.sp_emp, i.zp_emp, i.tax, i.net, i.sp_er, i.zp_er, i.employer_cost])
    const csv = [head, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `mzdy-${run.year}-${String(run.month).padStart(2, '0')}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500)
  }
  function payslip(item: Item, run: Run) {
    const w = window.open('', '_blank', 'width=720,height=900'); if (!w) return
    const row = (l: string, v: string) => `<tr><td style="padding:4px 0;color:#555">${l}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${v}</td></tr>`
    w.document.write(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Výplatní lístek</title>
    <style>body{font-family:system-ui,Segoe UI,sans-serif;max-width:560px;margin:32px auto;color:#111;padding:0 16px} h1{font-size:18px;margin:0 0 4px} .muted{color:#777;font-size:12px} table{width:100%;border-collapse:collapse;margin-top:12px} .tot td{border-top:2px solid #111;font-weight:700;padding-top:6px}</style>
    </head><body>
    <h1>Výplatní lístek — kontrolní</h1>
    <div class="muted">${item.name} · ${MONTHS[run.month - 1]} ${run.year} · ${REGIME_LABEL[item.regime] || ''}</div>
    <table>
    ${row('Hrubá mzda', czk(item.gross))}
    ${row('Sociální pojištění (zaměstnanec)', '−' + czk(item.sp_emp))}
    ${row('Zdravotní pojištění (zaměstnanec)', '−' + czk(item.zp_emp))}
    ${row(Number(item.tax) >= 0 ? 'Záloha na daň po slevách' : 'Daňový bonus', (Number(item.tax) >= 0 ? '−' : '+') + czk(Math.abs(Number(item.tax))))}
    <tr class="tot"><td>Čistá mzda</td><td style="text-align:right">${czk(item.net)}</td></tr>
    </table>
    <table>
    ${row('Náklady zaměstnavatele', czk(item.employer_cost))}
    ${row('— SP zaměstnavatel', czk(item.sp_er))}
    ${row('— ZP zaměstnavatel', czk(item.zp_er))}
    </table>
    ${item.note ? `<p class="muted">Poznámka: ${item.note}</p>` : ''}
    <p class="muted" style="margin-top:24px">Orientační kontrolní výpočet. Závazné mzdy a odvody potvrzuje mzdová účtárna.</p>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-700 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span><b>Kontrolní výpočet.</b> Sazby a prahy jsou parametrizované dle roku (tlačítko „Sazby a slevy"). Závazné mzdy a odvody potvrzuje mzdová účtárna — udržuj sazby aktuální.</span>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div><Label className="text-xs text-muted-foreground">Měsíc</Label>
          <select value={m} onChange={(e) => setM(Number(e.target.value))} className={selectClass}>{MONTHS.map((l, i) => <option key={i} value={i + 1}>{l}</option>)}</select>
        </div>
        <div className="w-24"><Label className="text-xs text-muted-foreground">Rok</Label><Input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} /></div>
        <Button onClick={newRun} disabled={pending}><Plus className="size-4" />Nová uzávěrka</Button>
        <Button variant="outline" onClick={() => setCfgOpen(true)}><Settings2 className="size-4" />Sazby a slevy</Button>
      </div>

      {runs.length === 0 ? (
        <EmptyState icon={Calculator} title="Žádné uzávěrky" description="Vytvoř měsíční uzávěrku — vygenerují se řádky pro aktivní zaměstnance z jejich mzdy/sazby." />
      ) : runs.map((run) => {
        const sum = run.items.reduce((a: any, i: Item) => ({ gross: a.gross + Number(i.gross), net: a.net + Number(i.net), cost: a.cost + Number(i.employer_cost) }), { gross: 0, net: 0, cost: 0 })
        const locked = run.status === 'locked'
        return (
          <div key={run.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{MONTHS[run.month - 1]} {run.year}</span>
                <Badge variant={locked ? 'secondary' : 'info'}>{locked ? 'Uzamčeno' : 'Rozpracováno'}</Badge>
                <span className="text-xs text-muted-foreground">Σ hrubé {czk(sum.gross)} · čisté {czk(sum.net)} · náklad {czk(sum.cost)}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => exportCsv(run)}><Download className="size-4" />CSV</Button>
                {!locked && <Button size="sm" variant="ghost" onClick={() => lock(run)}><Lock className="size-4" />Uzamknout</Button>}
                {locked && isAdmin && <Button size="sm" variant="ghost" onClick={() => unlock(run)}><Unlock className="size-4" />Odemknout</Button>}
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeRun(run)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            {run.items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Žádné řádky (nemáš aktivní zaměstnance se mzdou).</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zaměstnanec</TableHead><TableHead>Režim</TableHead>
                    <TableHead className="text-right">Hrubá</TableHead><TableHead className="text-right">Pojistné</TableHead>
                    <TableHead className="text-right">Daň</TableHead><TableHead className="text-right">Čistá</TableHead>
                    <TableHead className="text-right">Náklad ZL</TableHead><TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.items.map((i: Item) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium text-foreground">{i.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{REGIME_LABEL[i.regime] || i.regime}</TableCell>
                      <TableCell className="text-right tabular-nums">{czk(i.gross)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{czk(Number(i.sp_emp) + Number(i.zp_emp))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{Number(i.tax) < 0 ? `+${czk(-Number(i.tax))}` : czk(i.tax)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{czk(i.net)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{czk(i.employer_cost)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label="Výplatnice" onClick={() => payslip(i, run)}><FileText className="size-3.5" /></Button>
                          {!locked && <Button size="icon-sm" variant="ghost" aria-label="Upravit" onClick={() => setEdit({ run, item: i })}><Edit2 className="size-3.5" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )
      })}

      {edit && <ItemDialog item={edit.item} onClose={() => setEdit(null)} />}
      {cfgOpen && <ConfigDialog config={config} defaults={defaults} year={year} onClose={() => setCfgOpen(false)} />}
    </div>
  )
}

function ItemDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const r = await savePayrollItem(item.id, fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Přepočítáno'); onClose() } })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mzda — {item.name}</DialogTitle>
          <DialogDescription>Uprav vstupy; čistá mzda, odvody a daň se přepočítají.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Typ</Label>
              <select name="contractType" defaultValue={item.contract_type} className={selectClass}>{Object.entries(CONTRACTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Hrubá mzda (měs)</Label><Input type="number" step="0.01" name="gross" defaultValue={item.gross} autoFocus /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Děti (daň. zvýhodnění)</Label><Input type="number" min={0} name="children" defaultValue={item.children} /></div>
            <label className="flex items-center gap-2 pt-6 text-sm text-foreground"><input type="checkbox" name="taxpayerCredit" defaultChecked={item.taxpayer_credit} className="size-4 accent-primary" />Sleva na poplatníka</label>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" defaultValue={item.note || ''} placeholder="příplatky, bonusy…" /></div>
          <p className="text-[11px] text-muted-foreground">Hrubá zahrnuje i příplatky/bonusy (zadej souhrnem). DPP/DPČ pod prahem = bez pojistného.</p>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={pending}>{pending ? 'Počítám…' : 'Přepočítat'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfigDialog({ config, defaults, year, onClose }: { config: any; defaults: any; year: number; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const v = (k: string) => (config && config[k] != null ? config[k] : defaults[k])
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const r = await savePayrollConfig(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Sazby uloženy'); onClose() } })
  }
  const num = (name: string, label: string, step = '0.0001') => (
    <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label><Input type="number" step={step} name={name} defaultValue={v(name)} /></div>
  )
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sazby a slevy ({year})</DialogTitle>
          <DialogDescription>Parametry pro výpočet mezd. Uprav dle aktuální legislativy daného roku.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="year" value={year} />
          <div className="grid grid-cols-2 gap-3">
            {num('sp_emp', 'SP zaměstnanec (podíl)')}
            {num('zp_emp', 'ZP zaměstnanec (podíl)')}
            {num('sp_er', 'SP zaměstnavatel (podíl)')}
            {num('zp_er', 'ZP zaměstnavatel (podíl)')}
            {num('tax_rate1', 'Daň sazba 1')}
            {num('tax_rate2', 'Daň sazba 2 (progrese)')}
            {num('tax_progress_monthly', 'Hranice progrese / měs', '1')}
            {num('srazkova_rate', 'Srážková daň')}
            {num('credit_taxpayer', 'Sleva na poplatníka / měs', '1')}
            {num('credit_child1', 'Zvýhodnění 1. dítě', '1')}
            {num('credit_child2', 'Zvýhodnění 2. dítě', '1')}
            {num('credit_child3', 'Zvýhodnění 3.+ dítě', '1')}
            {num('min_wage_hour', 'Min. mzda / h', '0.01')}
            {num('dpp_threshold', 'DPP práh odvodů', '1')}
            {num('dpc_threshold', 'DPČ práh odvodů', '1')}
          </div>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
