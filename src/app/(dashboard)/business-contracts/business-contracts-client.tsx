'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, FileSignature, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { createBusinessContract, updateBusinessContract, deleteBusinessContract, toggleAcknowledged } from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const PARTY: Record<string, string> = { artist: 'Umělec', rental: 'Pronájem', supplier: 'Dodavatel', client: 'Klient', other: 'Ostatní' }
const STATUS: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  active: { label: 'Aktivní', variant: 'success' },
  expired: { label: 'Vypršela', variant: 'destructive' },
  terminated: { label: 'Ukončena', variant: 'secondary' },
}

type Opt = { id: string; name: string }

function expiry(end: string | null, status: string) {
  if (!end || status === 'terminated') return null
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  if (end < today) return { label: 'Po expiraci', variant: 'destructive' as const }
  if (end <= soon) return { label: 'Brzy vyprší', variant: 'warning' as const }
  return null
}

export function BusinessContractsClient({ contracts, suppliers, clients, events }: { contracts: any[]; suppliers: Opt[]; clients: Opt[]; events: Opt[] }) {
  const [dialog, setDialog] = useState<{ item: any | null } | null>(null)
  const [isPending, start] = useTransition()

  function ack(c: any) {
    start(async () => { const r = await toggleAcknowledged(c.id, !c.acknowledged_at); if (r?.error) toast.error('Chyba', r.error); else toast.success(c.acknowledged_at ? 'Akceptace zrušena' : 'Akceptováno') })
  }
  async function remove(c: any) {
    const ok = await confirmDialog({ title: `Smazat smlouvu „${c.title}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deleteBusinessContract(c.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{contracts.length} smluv</p>
        <Button size="lg" onClick={() => setDialog({ item: null })}><Plus className="size-4" />Nová smlouva</Button>
      </div>

      {contracts.length === 0 ? (
        <EmptyState icon={FileSignature} title="Žádné smlouvy" description="Eviduj smlouvy s umělci, pronájmy a dodavateli — vč. expirace a akceptace." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Protistrana</TableHead>
                <TableHead>Platnost</TableHead>
                <TableHead className="text-right">Hodnota</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Akceptace</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => {
                const st = STATUS[c.status] ?? STATUS.active
                const ex = expiry(c.end_date, c.status)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.title}</TableCell>
                    <TableCell className="text-muted-foreground"><span className="text-xs text-muted-foreground">{PARTY[c.party_type] ?? c.party_type}</span><div>{c.party_name || '—'}</div></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('cs-CZ') : '—'} – {c.end_date ? new Date(c.end_date).toLocaleDateString('cs-CZ') : '—'}
                      {ex && <Badge variant={ex.variant} className="ml-1.5 h-4 px-1.5 text-[10px]">{ex.label}</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">{c.value != null ? czk(Number(c.value), c.currency) : '—'}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell>
                      {c.acknowledged_at
                        ? <Badge variant="success" className="cursor-pointer" onClick={() => ack(c)}>Akceptováno</Badge>
                        : <Button variant="outline" size="sm" disabled={isPending} onClick={() => ack(c)}><Check className="size-3.5" />Akceptovat</Button>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-xs" aria-label="Upravit" disabled={isPending} onClick={() => setDialog({ item: c })}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(c)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {dialog && <ContractDialog item={dialog.item} suppliers={suppliers} clients={clients} events={events} onClose={() => setDialog(null)} />}
    </div>
  )
}

function ContractDialog({ item, suppliers, clients, events, onClose }: { item: any | null; suppliers: Opt[]; clients: Opt[]; events: Opt[]; onClose: () => void }) {
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const r = item ? await updateBusinessContract(item.id, fd) : await createBusinessContract(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success(item ? 'Smlouva upravena' : 'Smlouva přidána'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{item ? 'Upravit smlouvu' : 'Nová smlouva'}</DialogTitle><DialogDescription>Smlouva s umělcem, pronájem, dodavatel…</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required defaultValue={item?.title ?? ''} placeholder="např. Vystoupení DJ XY" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Typ protistrany</Label>
              <select name="partyType" defaultValue={item?.party_type ?? 'other'} className={selectClass}>{Object.entries(PARTY).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Protistrana (text)</Label><Input name="counterparty" defaultValue={item?.counterparty ?? ''} placeholder="jméno / firma" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dodavatel</Label>
              <select name="supplierId" defaultValue={item?.supplier_id ?? 'none'} className={selectClass}><option value="none">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CRM klient</Label>
              <select name="clientId" defaultValue={item?.client_id ?? 'none'} className={selectClass}><option value="none">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Akce</Label>
              <select name="eventId" defaultValue={item?.event_id ?? 'none'} className={selectClass}><option value="none">—</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue={item?.status ?? 'active'} className={selectClass}>{Object.entries(STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Začátek</Label><Input type="date" name="startDate" defaultValue={item?.start_date ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Konec / expirace</Label><Input type="date" name="endDate" defaultValue={item?.end_date ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Hodnota</Label><Input type="number" step="0.01" name="value" defaultValue={item?.value ?? ''} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Typ smlouvy</Label><Input name="type" defaultValue={item?.type ?? ''} placeholder="např. vystoupení, pronájem" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" defaultValue={item?.note ?? ''} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : item ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
