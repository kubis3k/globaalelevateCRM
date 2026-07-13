'use client'

import { useRef, useState, useTransition } from 'react'
import { Wallet, Upload, Plus, Trash2, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveBudgetItem, deleteBudgetItem, importBudgetItems } from '../actions'

const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)

function toNum(v: unknown): number | null {
  if (v === '' || v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim().replace(/\s/g, '').replace(/,/g, '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) return row[k]
  }
  return ''
}

export function BudgetSection({ eventId, budget, items, canManage }: { eventId: string; budget: number | null; items: any[]; canManage: boolean }) {
  const [pending, startTransition] = useTransition()
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const planned = items.reduce((a, i) => a + Number(i.planned || 0), 0)
  const actual = items.reduce((a, i) => a + Number(i.actual || 0), 0)
  const cap = budget != null ? Number(budget) : null

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form); fd.set('eventId', eventId)
    startTransition(async () => { const r = await saveBudgetItem(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Přidáno'); form.reset() } })
  }
  function remove(item: any) {
    confirmDialog({ title: 'Smazat položku?', description: item.item, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (ok) startTransition(async () => { const r = await deleteBudgetItem(item.id); if (r?.error) toast.error('Chyba', r.error) })
    })
  }

  async function handleFile(file: File) {
    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const parsed = rows
        .map((r) => ({
          category: String(pick(r, ['kategorie', 'category']) ?? '').trim() || null,
          item: String(pick(r, ['položka', 'polozka', 'item', 'name', 'název', 'nazev']) ?? '').trim(),
          planned: toNum(pick(r, ['plán', 'plan', 'planned', 'rozpočet', 'rozpocet', 'budget'])),
          actual: toNum(pick(r, ['skutečnost', 'skutecnost', 'actual', 'realita', 'čerpáno', 'cerpano'])),
          note: String(pick(r, ['poznámka', 'poznamka', 'note']) ?? '').trim() || null,
        }))
        .filter((r) => r.item)
      if (parsed.length === 0) { toast.error('Chyba', 'V souboru se nenašly žádné položky (očekává se sloupec Položka).'); return }
      const res = await importBudgetItems(eventId, parsed)
      if (res?.error) toast.error('Chyba', res.error)
      else toast.success('Naimportováno', `${res.count} položek rozpočtu z Excelu.`)
    } catch {
      toast.error('Chyba', 'Soubor se nepodařilo přečíst. Podporované formáty: .xlsx, .xls, .csv')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Wallet className="size-4" />Rozpočet
          <span className="text-xs font-normal text-muted-foreground">
            {cap != null ? ` · plán ${czk(cap)}` : ''} · naplánováno {czk(planned)} · čerpáno {czk(actual)}
            {cap != null && ` · zbývá ${czk(cap - actual)}`}
          </span>
        </h3>
        {canManage && (
          <div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <Button size="sm" variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />{importing ? 'Nahrávám…' : 'Import z Excelu'}
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatím žádné položky rozpočtu. Nahraj Excel (sloupce Kategorie / Položka / Plán / Skutečnost) nebo přidej ručně.</p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategorie</TableHead>
                <TableHead>Položka</TableHead>
                <TableHead className="text-right">Plán</TableHead>
                <TableHead className="text-right">Skutečnost</TableHead>
                <TableHead className="text-right">Rozdíl</TableHead>
                {canManage && <TableHead className="w-8" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const diff = Number(i.planned || 0) - Number(i.actual || 0)
                return (
                  <TableRow key={i.id}>
                    <TableCell>{i.category ? <Badge variant="outline">{i.category}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-medium text-foreground">{i.item}{i.note && <span className="ml-1 font-normal text-muted-foreground">· {i.note}</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.planned != null ? czk(Number(i.planned)) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.actual != null ? czk(Number(i.actual)) : '—'}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', diff < 0 ? 'text-destructive' : 'text-success')}>{i.planned != null || i.actual != null ? czk(diff) : '—'}</TableCell>
                    {canManage && <TableCell><button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button></TableCell>}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {canManage && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-1.5 rounded-lg border border-dashed border-border p-2">
          <Input name="category" placeholder="Kategorie" className="h-8 w-28" />
          <Input name="item" placeholder="Položka" className="h-8 min-w-32 flex-1" required />
          <Input name="planned" type="number" step="0.01" placeholder="plán" className="h-8 w-24" />
          <Input name="actual" type="number" step="0.01" placeholder="skutečnost" className="h-8 w-28" />
          <Button type="submit" size="sm" disabled={pending}><Plus className="size-4" /></Button>
        </form>
      )}
      {items.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileSpreadsheet className="size-3.5" />Šablona: první řádek = hlavičky (Kategorie, Položka, Plán, Skutečnost, Poznámka).</p>
      )}
    </section>
  )
}
