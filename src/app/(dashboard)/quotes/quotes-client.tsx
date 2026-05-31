'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Trash2, FileOutput, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createQuote, updateQuoteStatus, deleteQuote, convertQuoteToInvoice, type QuoteInput } from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const pf = (s: string) => Number((s || '').replace(',', '.')) || 0

const QUOTE_STATUS: Record<string, { label: string; variant: 'secondary' | 'info' | 'success' | 'destructive' }> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  sent: { label: 'Odesláno', variant: 'info' },
  accepted: { label: 'Přijato', variant: 'success' },
  rejected: { label: 'Odmítnuto', variant: 'destructive' },
}
const STATUS_OPTS = Object.entries(QUOTE_STATUS).map(([id, s]) => ({ id, label: s.label }))

type Client = { id: string; name: string }
type CatalogItem = { id: string; name: string; unit_price: number; vat_rate: number; unit: string }

export function QuotesClient({ quotes, clients, catalog }: { quotes: any[]; clients: Client[]; catalog: CatalogItem[] }) {
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()

  function setStatus(id: string, status: string) {
    startTransition(async () => { const res = await updateQuoteStatus(id, status); if (res?.error) toast.error('Chyba', res.error) })
  }
  async function convert(q: any) {
    const ok = await confirmDialog({ title: `Vytvořit fakturu z nabídky ${q.number}?`, description: 'Vznikne vydaná faktura (koncept) s částkou nabídky.', confirmLabel: 'Vytvořit fakturu' })
    if (!ok) return
    startTransition(async () => { const res = await convertQuoteToInvoice(q.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Faktura vytvořena') })
  }
  async function remove(q: any) {
    const ok = await confirmDialog({ title: `Smazat nabídku ${q.number}?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteQuote(q.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Nabídka smazána') })
  }

  const openValue = quotes.filter((q) => q.status === 'draft' || q.status === 'sent').reduce((a, q) => a + Number(q.total || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{quotes.length} nabídek · otevřená hodnota <span className="font-semibold tabular-nums text-foreground">{czk(openValue)}</span></p>
        <Button size="lg" onClick={() => setShowNew(true)}><Plus className="size-4" />Nová nabídka</Button>
      </div>

      {quotes.length === 0 ? (
        <EmptyState icon={ScrollText} title="Žádné nabídky" description="Vytvoř první cenovou nabídku a po přijetí ji převeď na fakturu." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Číslo</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Platí do</TableHead>
                <TableHead className="text-right">Celkem</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium text-foreground">{q.number}</TableCell>
                  <TableCell className="text-muted-foreground">{q.client_name || '—'}</TableCell>
                  <TableCell>
                    <select value={q.status} disabled={isPending} onChange={(e) => setStatus(q.id, e.target.value)} className={cn(selectClass, 'h-7 w-32 text-xs')}>
                      {STATUS_OPTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{q.valid_until ? new Date(q.valid_until).toLocaleDateString('cs-CZ') : '—'}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">{czk(Number(q.total), q.currency)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {q.invoice_id ? (
                        <Badge variant="success">Faktura</Badge>
                      ) : (
                        <Button variant="ghost" size="icon-xs" aria-label="Převést na fakturu" title="Převést na fakturu" disabled={isPending} onClick={() => convert(q)}><FileOutput className="size-3.5" /></Button>
                      )}
                      <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(q)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showNew && <QuoteDialog clients={clients} catalog={catalog} onClose={() => setShowNew(false)} />}
    </div>
  )
}

type Row = { id: number; catalogItemId: string; description: string; quantity: string; unitPrice: string; vatRate: string }

function QuoteDialog({ clients, catalog, onClose }: { clients: Client[]; catalog: CatalogItem[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const idRef = useRef(1)
  const today = new Date().toISOString().slice(0, 10)
  const [rows, setRows] = useState<Row[]>([{ id: 0, catalogItemId: 'none', description: '', quantity: '1', unitPrice: '', vatRate: '21' }])

  function addRow() { setRows((r) => [...r, { id: idRef.current++, catalogItemId: 'none', description: '', quantity: '1', unitPrice: '', vatRate: '21' }]) }
  function removeRow(id: number) { setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r)) }
  function update(id: number, patch: Partial<Row>) { setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x))) }
  function pickCatalog(id: number, catalogItemId: string) {
    const ci = catalog.find((c) => c.id === catalogItemId)
    if (ci) update(id, { catalogItemId, description: ci.name, unitPrice: String(ci.unit_price), vatRate: String(ci.vat_rate) })
    else update(id, { catalogItemId: 'none' })
  }

  let subtotal = 0, vat = 0
  for (const r of rows) { const line = pf(r.quantity) * pf(r.unitPrice); subtotal += line; vat += (line * pf(r.vatRate)) / 100 }
  const total = subtotal + vat

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload: QuoteInput = {
      number: (fd.get('number') as string) || undefined,
      clientId: (fd.get('clientId') as string) || null,
      issueDate: (fd.get('issueDate') as string) || today,
      validUntil: (fd.get('validUntil') as string) || null,
      currency: (fd.get('currency') as string) || 'CZK',
      note: (fd.get('note') as string) || null,
      items: rows.map((r) => ({ description: r.description, quantity: pf(r.quantity), unitPrice: pf(r.unitPrice), vatRate: pf(r.vatRate), catalogItemId: r.catalogItemId !== 'none' ? r.catalogItemId : null })),
    }
    startTransition(async () => { const res = await createQuote(payload); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Nabídka vytvořena'); onClose() })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Nová nabídka</DialogTitle><DialogDescription>Sestav položky; číslo se doplní automaticky.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Číslo</Label><Input name="number" placeholder="auto (NAB-…)" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Klient</Label>
              <select name="clientId" defaultValue="none" className={selectClass}>
                <option value="none">— bez klienta —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="issueDate" defaultValue={today} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Platí do</Label><Input type="date" name="validUntil" /></div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Položky</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-3.5" />Přidat řádek</Button>
            </div>
            {rows.map((r) => {
              const line = pf(r.quantity) * pf(r.unitPrice)
              return (
                <div key={r.id} className="space-y-2 rounded-lg border border-border p-2">
                  <div className="flex gap-2">
                    <select value={r.catalogItemId} onChange={(e) => pickCatalog(r.id, e.target.value)} className={cn(selectClass, 'flex-1')}>
                      <option value="none">— vlastní položka —</option>
                      {catalog.map((ci) => <option key={ci.id} value={ci.id}>{ci.name}</option>)}
                    </select>
                    <Button type="button" variant="ghost" size="icon-xs" aria-label="Odebrat řádek" className="text-muted-foreground hover:text-destructive" onClick={() => removeRow(r.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                  <Input value={r.description} onChange={(e) => update(r.id, { description: e.target.value })} placeholder="Popis položky" />
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Množství</Label><Input value={r.quantity} onChange={(e) => update(r.id, { quantity: e.target.value })} inputMode="decimal" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Cena/j.</Label><Input value={r.unitPrice} onChange={(e) => update(r.id, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">DPH %</Label><Input value={r.vatRate} onChange={(e) => update(r.id, { vatRate: e.target.value })} inputMode="decimal" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Řádek</Label><div className="flex h-8 items-center justify-end text-sm font-medium tabular-nums text-foreground">{czk(line)}</div></div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" placeholder="Volitelná poznámka k nabídce" /></div>

          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Bez DPH</span><span className="tabular-nums">{czk(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>DPH</span><span className="tabular-nums">{czk(vat)}</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold text-foreground"><span>Celkem</span><span className="tabular-nums">{czk(total)}</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Vytvořit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
