'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Phone, Mail, Globe, MapPin, Star, FileText,
  StickyNote, PhoneCall, Users, CheckSquare, Square, Building2, DoorOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createContact, deleteContact, createActivity, toggleActivity, deleteActivity } from '../../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const STATUS: Record<string, { variant: 'success' | 'secondary' | 'info'; label: string }> = {
  active: { variant: 'success', label: 'Aktivní' }, inactive: { variant: 'secondary', label: 'Neaktivní' }, lead: { variant: 'info', label: 'Lead' },
}
const ACT_TYPES: Record<string, { label: string; icon: any }> = {
  note: { label: 'Poznámka', icon: StickyNote }, call: { label: 'Hovor', icon: PhoneCall },
  meeting: { label: 'Schůzka', icon: Users }, email: { label: 'E-mail', icon: Mail }, task: { label: 'Úkol', icon: CheckSquare },
}
const INV_STATUS: Record<string, { variant: 'secondary' | 'info' | 'success' | 'destructive' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Koncept' }, pending: { variant: 'info', label: 'Čeká' }, paid: { variant: 'success', label: 'Uhrazeno' }, overdue: { variant: 'destructive', label: 'Po splatnosti' }, cancelled: { variant: 'warning', label: 'Storno' },
}

export function ClientDetail({ client, contacts, activities, portalMessages, invoices }: { client: any; contacts: any[]; activities: any[]; portalMessages: any[]; invoices: any[] }) {
  const [showContact, setShowContact] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [isPending, startTransition] = useTransition()
  const st = STATUS[client.status] ?? STATUS.active

  const billed = invoices.reduce((a, i) => a + Number(i.amount || 0), 0)
  const paid = invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + Number(i.amount || 0), 0)

  // Sloučený feed: interní CRM aktivity + zprávy z klientského portálu — jedno
  // místo pro celou komunikaci s klientem.
  const feed = useMemo(() => {
    const a = activities.map((x) => ({ kind: 'activity' as const, at: x.created_at, data: x }))
    const m = portalMessages.map((x) => ({ kind: 'message' as const, at: x.created_at, data: x }))
    return [...a, ...m].sort((x, y) => (x.at < y.at ? 1 : -1))
  }, [activities, portalMessages])

  async function removeContact(c: any) {
    const ok = await confirmDialog({ title: `Smazat kontakt „${c.name}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteContact(c.id, client.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Kontakt smazán') })
  }
  function toggle(a: any) {
    startTransition(async () => { const res = await toggleActivity(a.id, client.id, !a.done); if (res?.error) toast.error('Chyba', res.error) })
  }
  async function removeActivity(a: any) {
    const ok = await confirmDialog({ title: 'Smazat aktivitu?', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteActivity(a.id, client.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Aktivita smazána') })
  }

  return (
    <div className="space-y-6">
      <Link href="/crm/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Zpět na klienty</Link>

      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-xs">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: '#06b6d4' }}><Building2 className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{client.name}</h2>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {client.email && <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{client.email}</span>}
            {client.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{client.phone}</span>}
            {client.website && <a href={client.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground"><Globe className="size-3.5" />Web</a>}
            {client.address && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{client.address}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
            {client.ico && <span>IČO: {client.ico}</span>}
            {client.dic && <span>DIČ: {client.dic}</span>}
            {client.owner_name && <span>Vlastník: {client.owner_name}</span>}
          </div>
          {client.note && <p className="mt-2 text-sm text-muted-foreground">{client.note}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contacts */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Kontaktní osoby</h3>
            <Button variant="outline" size="sm" onClick={() => setShowContact(true)}><Plus className="size-3.5" />Kontakt</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {contacts.length === 0 ? <EmptyState icon={Users} title="Žádné kontakty" /> : (
              <div className="divide-y divide-border">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">{c.name}{c.is_primary && <Star className="size-3.5 text-warning" />}</div>
                      <div className="text-xs text-muted-foreground">{[c.position, c.email, c.phone].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => removeContact(c)}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Linked invoices */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Faktury</h3>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {invoices.length === 0 ? <EmptyState icon={FileText} title="Žádné faktury" description="Vytvořte fakturu a přiřaďte ji klientovi." /> : (
              <>
                <Table>
                  <TableHeader><TableRow><TableHead>Číslo</TableHead><TableHead className="text-right">Částka</TableHead><TableHead>Stav</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {invoices.map((i) => {
                      const s = INV_STATUS[i.status] ?? INV_STATUS.draft
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-foreground">{i.invoice_number}</TableCell>
                          <TableCell className="text-right tabular-nums">{czk(Number(i.amount), i.currency)}</TableCell>
                          <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  <span>Fakturováno: <span className="font-semibold tabular-nums text-foreground">{czk(billed)}</span></span>
                  <span>Uhrazeno: <span className="font-semibold tabular-nums text-success">{czk(paid)}</span></span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Activities + komunikace z portálu (jeden feed) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Aktivity a komunikace</h3>
          <Button variant="outline" size="sm" onClick={() => setShowActivity(true)}><Plus className="size-3.5" />Aktivita</Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {feed.length === 0 ? <EmptyState icon={StickyNote} title="Žádné aktivity" description="Zaznamenejte hovor, schůzku nebo poznámku — případně zprávy z portálu se objeví zde automaticky." /> : (
            <div className="divide-y divide-border">
              {feed.map((f) => {
                if (f.kind === 'message') {
                  const m = f.data
                  return (
                    <div key={`m-${m.id}`} className="flex items-start gap-3 bg-info/5 p-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info"><DoorOpen className="size-3.5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{m.subject || 'Zpráva z portálu'}</span>
                          <Badge variant="info" className="h-4 px-1.5 text-[10px]">Klient</Badge>
                          <Badge variant={m.status === 'resolved' ? 'success' : 'secondary'} className="h-4 px-1.5 text-[10px]">{m.status === 'resolved' ? 'Vyřízeno' : 'Nové'}</Badge>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{m.body}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{new Date(m.created_at).toLocaleString('cs-CZ')}</span>
                          <span>·</span>
                          <Link href="/portal-admin" className="text-primary hover:underline">Vyřídit v Portál-adminu</Link>
                        </div>
                      </div>
                    </div>
                  )
                }
                const a = f.data
                const t = ACT_TYPES[a.type] ?? ACT_TYPES.note
                const Icon = t.icon
                return (
                  <div key={`a-${a.id}`} className="flex items-start gap-3 p-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-medium text-foreground', a.done && 'text-muted-foreground line-through')}>{a.subject}</span>
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{t.label}</Badge>
                        {a.visible_to_client && <Badge variant="info" className="h-4 px-1.5 text-[10px]">Vidí klient</Badge>}
                      </div>
                      {a.content && <p className="mt-0.5 text-xs text-muted-foreground">{a.content}</p>}
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString('cs-CZ')}{a.due_date && ` · termín ${new Date(a.due_date).toLocaleDateString('cs-CZ')}`}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={a.done ? 'Označit jako nehotové' : 'Označit jako hotové'} disabled={isPending} onClick={() => toggle(a)} className={a.done ? 'text-success' : 'text-muted-foreground'}>{a.done ? <CheckSquare className="size-4" /> : <Square className="size-4" />}</Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => removeActivity(a)}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {showContact && <ContactDialog clientId={client.id} onClose={() => setShowContact(false)} />}
      {showActivity && <ActivityDialog clientId={client.id} onClose={() => setShowActivity(false)} />}
    </div>
  )
}

function ContactDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await createContact(clientId, fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Kontakt přidán'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nový kontakt</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Jméno</Label><Input name="name" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Pozice</Label><Input name="position" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Telefon</Label><Input name="phone" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">E-mail</Label><Input type="email" name="email" /></div>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" name="isPrimary" className="size-4 rounded border-input" />Hlavní kontakt</label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ActivityDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await createActivity(clientId, fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Aktivita přidána'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nová aktivita</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Typ</Label>
              <select name="type" defaultValue="note" className={selectClass}>
                {Object.entries(ACT_TYPES).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Termín (volitelné)</Label><Input type="date" name="dueDate" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Předmět</Label><Input name="subject" required placeholder="Např. Úvodní hovor" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="content" placeholder="Detaily…" /></div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="visibleToClient" className="size-4 rounded border-input" />
            Zobrazit klientovi v portálu (komunikace)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
