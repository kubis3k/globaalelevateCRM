'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Trash2, Receipt, ClipboardList } from 'lucide-react'
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
import { createPurchaseOrder, updatePOStatus, deletePurchaseOrder, bookPurchaseOrderExpense, type POInput } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const pf = (s: string) => Number((s || '').replace(',', '.')) || 0

const STATUS: { id: string; label: string }[] = [
  { id: 'draft', label: 'Koncept' },
  { id: 'sent', label: 'Odesláno' },
  { id: 'confirmed', label: 'Potvrzeno' },
  { id: 'delivered', label: 'Dodáno' },
  { id: 'cancelled', label: 'Zrušeno' },
]

type Opt = { id: string; name: string }

export function OrdersClient({ orders, suppliers, events }: { orders: any[]; suppliers: Opt[]; events: { id: string; name: string; event_date: string | null }[] }) {
  const [showNew, setShowNew] = useState(false)
  const [isPending, start] = useTransition()

  function setStatus(id: string, status: string) {
    start(async () => { const r = await updatePOStatus(id, status); if (r?.error) toast.error('Chyba', r.error) })
  }
  async function book(o: any) {
    const ok = await confirmDialog({ title: `Zaúčtovat objednávku ${o.number}?`, description: `Vznikne výdaj ${czk(Number(o.total), o.currency)} ve Financích.`, confirmLabel: 'Zaúčtovat' })
    if (!ok) return
    start(async () => { const r = await bookPurchaseOrderExpense(o.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Zaúčtováno do Financí') })
  }
  async function remove(o: any) {
    const ok = await confirmDialog({ title: `Smazat objednávku ${o.number}?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deletePurchaseOrder(o.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Objednávka smazána') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{orders.length} objednávek</p>
        <Button size="lg" onClick={() => setShowNew(true)}><Plus className="size-4" />Nová objednávka</Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Žádné objednávky" description="Vytvoř objednávku u dodavatele a navaž ji na akci." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Číslo</TableHead>
                <TableHead>Dodavatel</TableHead>
                <TableHead>Akce</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Celkem</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-foreground">{o.number}</TableCell>
                  <TableCell className="text-muted-foreground">{o.supplier_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{o.event_name || '—'}</TableCell>
                  <TableCell>
                    <select value={o.status} disabled={isPending} onChange={(e) => setStatus(o.id, e.target.value)} className={cn(selectClass, 'h-7 w-28 text-xs')}>
                      {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">{czk(Number(o.total), o.currency)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {o.transaction_id ? (
                        <Badge variant="success">Zaúčtováno</Badge>
                      ) : (
                        <Button variant="ghost" size="icon-xs" aria-label="Zaúčtovat do Financí" title="Zaúčtovat do Financí" disabled={isPending} onClick={() => book(o)}><Receipt className="size-3.5" /></Button>
                      )}
                      <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(o)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showNew && <OrderDialog suppliers={suppliers} events={events} onClose={() => setShowNew(false)} />}
    </div>
  )
}

type Row = { id: number; description: string; quantity: string; unitPrice: string }

function OrderDialog({ suppliers, events, onClose }: { suppliers: Opt[]; events: { id: string; name: string; event_date: string | null }[]; onClose: () => void }) {
  const [pending, start] = useTransition()
  const idRef = useRef(1)
  const today = new Date().toISOString().slice(0, 10)
  const [rows, setRows] = useState<Row[]>([{ id: 0, description: '', quantity: '1', unitPrice: '' }])

  function addRow() { setRows((r) => [...r, { id: idRef.current++, description: '', quantity: '1', unitPrice: '' }]) }
  function removeRow(id: number) { setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r)) }
  function update(id: number, patch: Partial<Row>) { setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x))) }

  const total = rows.reduce((a, r) => a + pf(r.quantity) * pf(r.unitPrice), 0)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload: POInput = {
      number: (fd.get('number') as string) || undefined,
      supplierId: (fd.get('supplierId') as string) || null,
      eventId: (fd.get('eventId') as string) || null,
      orderDate: (fd.get('orderDate') as string) || today,
      expectedDate: (fd.get('expectedDate') as string) || null,
      currency: (fd.get('currency') as string) || 'CZK',
      note: (fd.get('note') as string) || null,
      items: rows.map((r) => ({ description: r.description, quantity: pf(r.quantity), unitPrice: pf(r.unitPrice) })),
    }
    start(async () => { const r = await createPurchaseOrder(payload); if (r?.error) { toast.error('Chyba', r.error); return } toast.success('Objednávka vytvořena'); onClose() })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Nová objednávka</DialogTitle><DialogDescription>Číslo se doplní automaticky.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Číslo</Label><Input name="number" placeholder="auto (OBJ-…)" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dodavatel</Label>
              <select name="supplierId" defaultValue="none" className={selectClass}>
                <option value="none">— bez dodavatele —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Akce</Label>
              <select name="eventId" defaultValue="none" className={selectClass}>
                <option value="none">— bez akce —</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="orderDate" defaultValue={today} /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Dodání do</Label><Input type="date" name="expectedDate" /></div>
            </div>
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
                    <Input value={r.description} onChange={(e) => update(r.id, { description: e.target.value })} placeholder="Popis položky" className="flex-1" />
                    <Button type="button" variant="ghost" size="icon-xs" aria-label="Odebrat" className="text-muted-foreground hover:text-destructive" onClick={() => removeRow(r.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Množství</Label><Input value={r.quantity} onChange={(e) => update(r.id, { quantity: e.target.value })} inputMode="decimal" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Cena/j.</Label><Input value={r.unitPrice} onChange={(e) => update(r.id, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0" /></div>
                    <div className="space-y-1"><Label className="text-[10px] text-muted-foreground">Řádek</Label><div className="flex h-8 items-center justify-end text-sm font-medium tabular-nums text-foreground">{czk(line)}</div></div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" /></div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm font-semibold text-foreground">
            <span>Celkem</span><span className="tabular-nums">{czk(total)}</span>
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
