'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit2, Plus, Trash2, Music2, ListOrdered, Users, MapPin, Clock, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { EventDialog, EV_STATUS } from '../events-client'
import { VipSection, GuestSection } from './event-vip-guests'
import { BudgetSection } from './event-budget'
import { saveLineup, deleteLineup, saveTimeline, deleteTimeline } from '../actions'

const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)
const t5 = (t: any) => (t ? String(t).slice(0, 5) : '')
const selectClass = 'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const LINEUP_STATUS: Record<string, string> = { booked: 'Rezervováno', confirmed: 'Potvrzeno', cancelled: 'Zrušeno' }

export function EventDetailClient({ event, lineup, timeline, reservations, guests, budgetItems, shifts, canManage }: {
  event: any; lineup: any[]; timeline: any[]; reservations: any[]; guests: any[]; budgetItems: any[]; shifts: any[]; canManage: boolean
}) {
  const [edit, setEdit] = useState(false)
  const [pending, startTransition] = useTransition()
  const s = EV_STATUS[event.status] || EV_STATUS.planning
  const fees = lineup.reduce((a, l) => a + Number(l.fee || 0), 0)

  function addLineup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form); fd.set('eventId', event.id)
    startTransition(async () => { const r = await saveLineup(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Přidáno'); form.reset() } })
  }
  function addTimeline(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form); fd.set('eventId', event.id)
    startTransition(async () => { const r = await saveTimeline(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Přidáno'); form.reset() } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/events" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Akce</Link>
        {canManage && <Button size="sm" variant="outline" onClick={() => setEdit(true)}><Edit2 className="size-4" />Upravit akci</Button>}
      </div>

      {/* Overview */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">{event.name}</h2>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-1.5"><Clock className="size-4" />{event.event_date ? new Date(event.event_date).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'bez data'}{event.start_time ? ` · ${t5(event.start_time)}` : ''}{event.doors_time ? ` (dveře ${t5(event.doors_time)})` : ''}</div>
          {event.location && <div className="flex items-center gap-1.5"><MapPin className="size-4" />{event.location}</div>}
          {event.capacity != null && <div className="flex items-center gap-1.5"><Users className="size-4" />Kapacita {event.capacity}</div>}
          {event.budget != null && <div className="flex items-center gap-1.5"><Wallet className="size-4" />Rozpočet {czk(Number(event.budget))}{fees > 0 ? ` · honoráře ${czk(fees)}` : ''}</div>}
          {event.client && <div>Klient: {event.client}</div>}
        </div>
        {event.tech_notes && <p className="mt-2 text-sm text-foreground"><span className="text-muted-foreground">Technika: </span>{event.tech_notes}</p>}
        {event.description && <p className="mt-1 text-sm text-foreground">{event.description}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line-up */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Music2 className="size-4" />Line-up</h3>
          <div className="space-y-1.5">
            {lineup.length === 0 && <p className="text-sm text-muted-foreground">Zatím bez line-upu.</p>}
            {lineup.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span className="tabular-nums text-muted-foreground">{t5(l.slot_start)}{l.slot_end ? `–${t5(l.slot_end)}` : ''}</span>
                <span className="font-medium text-foreground">{l.artist}</span>
                <Badge variant={l.status === 'confirmed' ? 'success' : l.status === 'cancelled' ? 'secondary' : 'outline'}>{LINEUP_STATUS[l.status] || l.status}</Badge>
                {l.fee != null && <span className="ml-auto tabular-nums text-muted-foreground">{czk(Number(l.fee))}</span>}
                {canManage && <button onClick={() => startTransition(async () => { const r = await deleteLineup(l.id); if (r?.error) toast.error('Chyba', r.error) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>}
              </div>
            ))}
          </div>
          {canManage && (
            <form onSubmit={addLineup} className="flex flex-wrap items-end gap-1.5 rounded-lg border border-dashed border-border p-2">
              <Input name="artist" placeholder="Umělec / DJ" className="h-8 min-w-32 flex-1" required />
              <Input name="slotStart" type="time" className="h-8 w-24" />
              <Input name="slotEnd" type="time" className="h-8 w-24" />
              <Input name="fee" type="number" step="0.01" placeholder="honorář" className="h-8 w-24" />
              <select name="status" defaultValue="booked" className={selectClass}><option value="booked">Rezervováno</option><option value="confirmed">Potvrzeno</option><option value="cancelled">Zrušeno</option></select>
              <Button type="submit" size="sm" disabled={pending}><Plus className="size-4" /></Button>
            </form>
          )}
        </section>

        {/* Run-of-show */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><ListOrdered className="size-4" />Run-of-show</h3>
          <div className="space-y-1.5">
            {timeline.length === 0 && <p className="text-sm text-muted-foreground">Zatím bez časového plánu.</p>}
            {timeline.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{t5(t.at_time)}</span>
                <span className="text-foreground">{t.item}</span>
                {canManage && <button onClick={() => startTransition(async () => { const r = await deleteTimeline(t.id); if (r?.error) toast.error('Chyba', r.error) })} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>}
              </div>
            ))}
          </div>
          {canManage && (
            <form onSubmit={addTimeline} className="flex items-end gap-1.5 rounded-lg border border-dashed border-border p-2">
              <Input name="atTime" type="time" className="h-8 w-24" />
              <Input name="item" placeholder="Co se děje (soundcheck, headliner…)" className="h-8 flex-1" required />
              <Button type="submit" size="sm" disabled={pending}><Plus className="size-4" /></Button>
            </form>
          )}
        </section>
      </div>

      {/* Rozpočet */}
      <BudgetSection eventId={event.id} budget={event.budget} items={budgetItems} canManage={canManage} />

      {/* VIP + Guest list */}
      <div className="grid gap-6 lg:grid-cols-2">
        <VipSection eventId={event.id} reservations={reservations} canManage={canManage} />
        <GuestSection eventId={event.id} guests={guests} canManage={canManage} />
      </div>

      {/* Staffing */}
      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Users className="size-4" />Obsazení (směny v den akce)</h3>
        {!event.event_date ? (
          <p className="text-sm text-muted-foreground">Doplň datum akce a směny se propojí.</p>
        ) : shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádné směny na {new Date(event.event_date).toLocaleDateString('cs-CZ')}. Naplánuj je v <Link href="/hr/shifts" className="text-primary hover:underline">HR → Směny</Link>.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {shifts.map((sh) => (
              <div key={sh.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="font-medium text-foreground">{t5(sh.start_time)}–{t5(sh.end_time)} · {sh.role || 'Směna'}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sh.assignments.length === 0 ? <span className="text-xs text-muted-foreground">neobsazeno</span> : sh.assignments.map((a: any) => (
                    <span key={a.id} className={cn('rounded px-1.5 py-0.5 text-xs', a.status === 'confirmed' ? 'bg-success/15 text-success' : a.status === 'declined' ? 'bg-muted text-muted-foreground line-through' : 'bg-primary/10 text-foreground')}>{a.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {edit && canManage && <EventDialog event={event} onClose={() => setEdit(false)} />}
    </div>
  )
}
