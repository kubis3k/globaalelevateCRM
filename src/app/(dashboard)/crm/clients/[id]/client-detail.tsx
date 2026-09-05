'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Phone, Mail, Globe, MapPin, Star, FileText,
  StickyNote, PhoneCall, Users, CheckSquare, Square, Building2, DoorOpen,
  Pencil, ExternalLink, BarChart3, CalendarDays, FileSignature, PackageCheck,
  ReceiptText, Handshake, FolderOpen, Wallet, ArrowUpRight, ArrowDownLeft,
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
import { createContact, deleteContact, createActivity, toggleActivity, deleteActivity, updateCrmClient } from '../../actions'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const STATUS: Record<string, { variant: 'success' | 'secondary' | 'info'; label: string }> = {
  active: { variant: 'success', label: 'Aktivní' }, inactive: { variant: 'secondary', label: 'Neaktivní' }, lead: { variant: 'info', label: 'Lead' },
}
const ACT_TYPES: Record<string, { label: string; icon: any }> = {
  note: { label: 'Poznámka', icon: StickyNote }, call: { label: 'Hovor', icon: PhoneCall },
  meeting: { label: 'Schůzka', icon: Users }, email: { label: 'E-mail', icon: Mail }, task: { label: 'Úkol', icon: CheckSquare },
}

type UctoInvoice = { id: number; number: string; amount: number; currency: string; issueDate: string; dueDate: string | null; paid: boolean }
type Related = {
  deals: any[]; quotes: any[]; reports: any[]; deliverables: any[]; contracts: any[]; events: any[]; documentsCount: number
}

export function ClientDetail({
  client, contacts, activities, portalMessages, uctoInvoices, portalConnected, profiles, related,
}: {
  client: any; contacts: any[]; activities: any[]; portalMessages: any[]
  uctoInvoices: UctoInvoice[] | null; portalConnected: boolean; profiles: { id: string; name: string }[]; related: Related
}) {
  const [showContact, setShowContact] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [isPending, startTransition] = useTransition()
  const st = STATUS[client.status] ?? STATUS.active

  const inv = uctoInvoices ?? []
  const billed = inv.reduce((a, i) => a + Number(i.amount || 0), 0)
  const paid = inv.filter((i) => i.paid).reduce((a, i) => a + Number(i.amount || 0), 0)
  const unpaid = billed - paid
  const today = new Date().toISOString().slice(0, 10)

  const dealValue = related.deals.reduce((a, d) => a + Number(d.value || 0), 0)
  const contractValue = related.contracts.reduce((a, d) => a + Number(d.value || 0), 0)

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

      {/* Header + rychlé akce */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-start">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: '#06b6d4' }}><Building2 className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{client.name}</h2>
            <Badge variant={st.variant}>{st.label}</Badge>
            {portalConnected
              ? <Badge variant="info" className="gap-1"><DoorOpen className="size-3" />Portál napojen</Badge>
              : <Badge variant="secondary" className="gap-1"><DoorOpen className="size-3" />Bez portálu</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {client.email && <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="size-3.5" />{client.email}</a>}
            {client.phone && <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="size-3.5" />{client.phone}</a>}
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
        <div className="flex flex-wrap gap-2 sm:flex-col">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="size-3.5" />Upravit</Button>
          <Link href="/reports/klienti" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><BarChart3 className="size-3.5" />Nový report</Link>
          <Link href="/portal-admin" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><DoorOpen className="size-3.5" />Portál</Link>
        </div>
      </div>

      {/* KPI z účta */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Wallet className="size-4" />} label="Fakturováno (účto)" value={czk(billed)} hint={`${inv.length} dokladů`} />
        <Kpi icon={<ArrowUpRight className="size-4" />} label="Uhrazeno" value={czk(paid)} tone="pos" />
        <Kpi icon={<ArrowDownLeft className="size-4" />} label="Neuhrazeno" value={czk(unpaid)} tone={unpaid > 0 ? 'neg' : undefined} />
        <Kpi icon={<Handshake className="size-4" />} label="Obchod (deals)" value={czk(dealValue)} hint={`${related.deals.length} příležitostí`} />
      </div>

      {/* Přehled napojení */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <OverviewCard icon={<BarChart3 className="size-4" />} label="Reporty" count={related.reports.length} href="/reports/klienti" hint={`${related.reports.filter((r) => r.status === 'sent').length} odesláno`} />
        <OverviewCard icon={<CalendarDays className="size-4" />} label="Události" count={related.events.length} href="/events" />
        <OverviewCard icon={<FileSignature className="size-4" />} label="Smlouvy" count={related.contracts.length} href="/business-contracts" hint={contractValue ? czk(contractValue) : undefined} />
        <OverviewCard icon={<ReceiptText className="size-4" />} label="Nabídky" count={related.quotes.length} href="/quotes" />
        <OverviewCard icon={<PackageCheck className="size-4" />} label="Dodávky" count={related.deliverables.length} />
        <OverviewCard icon={<FolderOpen className="size-4" />} label="Dokumenty" count={related.documentsCount} href="/documents" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Kontakty */}
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

        {/* Faktury z účta */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Faktury <span className="text-xs font-normal text-muted-foreground">(z účetnictví)</span></h3>
            <a href="https://ucto.globaalelevate.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Účto <ExternalLink className="size-3" /></a>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {uctoInvoices === null ? (
              <div className="p-4 text-sm text-muted-foreground">Účetnictví je momentálně nedostupné.</div>
            ) : inv.length === 0 ? (
              <EmptyState icon={FileText} title="Žádné faktury" description="Pro tohoto klienta zatím v účtu nejsou vydané faktury." />
            ) : (
              <>
                <Table>
                  <TableHeader><TableRow><TableHead>Číslo</TableHead><TableHead>Splatnost</TableHead><TableHead>Stav</TableHead><TableHead className="text-right">Částka</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {inv.slice(0, 8).map((i) => {
                      const overdue = !i.paid && i.dueDate && i.dueDate < today
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium text-foreground">{i.number}</TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{i.dueDate ? new Date(i.dueDate).toLocaleDateString('cs-CZ') : '—'}</TableCell>
                          <TableCell>{i.paid ? <Badge variant="success">Uhrazeno</Badge> : overdue ? <Badge variant="destructive">Po splatnosti</Badge> : <Badge variant="info">Čeká</Badge>}</TableCell>
                          <TableCell className="text-right tabular-nums">{czk(Number(i.amount), i.currency)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
                  <span>Fakturováno: <span className="font-semibold tabular-nums text-foreground">{czk(billed)}</span></span>
                  <span>Neuhrazeno: <span className={cn('font-semibold tabular-nums', unpaid > 0 ? 'text-destructive' : 'text-success')}>{czk(unpaid)}</span></span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Aktivity + komunikace z portálu */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Aktivity a komunikace</h3>
          <Button variant="outline" size="sm" onClick={() => setShowActivity(true)}><Plus className="size-3.5" />Aktivita</Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {feed.length === 0 ? <EmptyState icon={StickyNote} title="Žádné aktivity" description="Zaznamenejte hovor, schůzku nebo poznámku — zprávy z portálu se objeví zde automaticky." /> : (
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
      {showEdit && <EditClientDialog client={client} profiles={profiles} onClose={() => setShowEdit(false)} />}
    </div>
  )
}

function Kpi({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</div>
      <div className={cn('mt-1 text-xl font-semibold tabular-nums', tone === 'pos' ? 'text-success' : tone === 'neg' ? 'text-destructive' : 'text-foreground')}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function OverviewCard({ icon, label, count, href, hint }: { icon: React.ReactNode; label: string; count: number; href?: string; hint?: string }) {
  const body = (
    <div className={cn('rounded-xl border border-border bg-card p-3 shadow-xs transition-colors', href && 'hover:border-ring/40 hover:bg-muted/40')}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{count}</div>
      {hint && <div className="truncate text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
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

function EditClientDialog({ client, profiles, onClose }: { client: any; profiles: { id: string; name: string }[]; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await updateCrmClient(client.id, fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Klient upraven'); router.refresh(); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upravit klienta</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="name" required defaultValue={client.name} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue={client.status || 'active'} className={selectClass}>
                <option value="active">Aktivní</option><option value="inactive">Neaktivní</option><option value="lead">Lead</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Vlastník</Label>
              <select name="ownerId" defaultValue={client.owner_id || ''} className={selectClass}>
                <option value="">— nepřiřazeno —</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">IČO</Label><Input name="ico" defaultValue={client.ico || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">DIČ</Label><Input name="dic" defaultValue={client.dic || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">E-mail</Label><Input type="email" name="email" defaultValue={client.email || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Telefon</Label><Input name="phone" defaultValue={client.phone || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Web</Label><Input name="website" defaultValue={client.website || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Adresa</Label><Input name="address" defaultValue={client.address || ''} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" defaultValue={client.note || ''} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
