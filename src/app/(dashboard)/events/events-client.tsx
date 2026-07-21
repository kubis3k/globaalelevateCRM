'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Edit2, PartyPopper, MapPin, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveEvent, deleteEvent } from './actions'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
export const EV_STATUS: Record<string, { label: string; variant: 'outline' | 'info' | 'success' | 'secondary' }> = {
  planning: { label: 'Plánováno', variant: 'outline' }, confirmed: { label: 'Potvrzeno', variant: 'info' }, done: { label: 'Proběhlo', variant: 'success' }, cancelled: { label: 'Zrušeno', variant: 'secondary' },
}
const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)
const t5 = (t: any) => (t ? String(t).slice(0, 5) : '')
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' }) : 'bez data'

type Opt = { id: string; name: string }

export function EventsClient({ events, clients, canManage }: { events: any[]; clients: Opt[]; canManage: boolean }) {
  const [dialog, setDialog] = useState<{ open: boolean; event: any | null }>({ open: false, event: null })
  const [pending, startTransition] = useTransition()

  function remove(e: any) {
    confirmDialog({ title: `Smazat akci „${e.name}"?`, description: 'Smaže i line-up a run-of-show.', confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const r = await deleteEvent(e.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{events.length} {events.length === 1 ? 'akce' : 'akcí'}</p>
        {canManage && <Button size="lg" onClick={() => setDialog({ open: true, event: null })}><Plus className="size-4" />Nová akce</Button>}
      </div>

      {events.length === 0 ? (
        <EmptyState icon={PartyPopper} title="Žádné akce" description={canManage ? 'Založ první event — pak doplníš line-up, run-of-show a obsazení.' : 'Zatím žádné akce.'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const s = EV_STATUS[e.status] || EV_STATUS.planning
            return (
              <div key={e.id} className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <Link href={`/events/${e.id}`} className="font-semibold text-foreground hover:underline">{e.name}</Link>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  <div>{fmtDate(e.event_date)}{e.start_time ? ` · ${t5(e.start_time)}` : ''}</div>
                  {e.location && <div className="flex items-center gap-1"><MapPin className="size-3" />{e.location}</div>}
                  {(e.capacity || e.client) && <div className="flex items-center gap-1">{e.capacity ? <><Users className="size-3" />{e.capacity}</> : null}{e.client ? <span className="ml-1">· {e.client}</span> : null}</div>}
                  {e.budget != null && <div>Rozpočet: {czk(Number(e.budget))}</div>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Link href={`/events/${e.id}`} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">Detail <ArrowRight className="size-3" /></Link>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ open: true, event: e })}><Edit2 className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => remove(e)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {dialog.open && canManage && <EventDialog event={dialog.event} clients={clients} onClose={() => setDialog({ open: false, event: null })} />}
    </div>
  )
}

export function EventDialog({ event, clients, onClose }: { event: any | null; clients: Opt[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!event
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const r = await saveEvent(fd); if (r?.error) { toast.error('Chyba', r.error); return } toast.success(isEdit ? 'Akce uložena' : 'Akce založena'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit akci' : 'Nová akce'}</DialogTitle>
          <DialogDescription>Základní info o eventu. Line-up a run-of-show doplníš v detailu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={event.id} />}
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název akce</Label><Input name="name" defaultValue={event?.name || ''} placeholder="např. OX Saturday w/ …" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="eventDate" defaultValue={event?.event_date || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue={event?.status || 'planning'} className={selectClass}><option value="planning">Plánováno</option><option value="confirmed">Potvrzeno</option><option value="done">Proběhlo</option><option value="cancelled">Zrušeno</option></select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Dveře</Label><Input type="time" name="doorsTime" defaultValue={t5(event?.doors_time)} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Začátek</Label><Input type="time" name="startTime" defaultValue={t5(event?.start_time)} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Konec</Label><Input type="time" name="endTime" defaultValue={t5(event?.end_time)} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Kapacita</Label><Input type="number" min={0} name="capacity" defaultValue={event?.capacity ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Místo</Label><Input name="location" defaultValue={event?.location || ''} placeholder="OX Club" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Klient / promotér (text)</Label><Input name="client" defaultValue={event?.client || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Rozpočet (Kč)</Label><Input type="number" step="0.01" name="budget" defaultValue={event?.budget ?? ''} /></div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Klient v CRM (řídí, co uvidí v portálu)</Label>
              <select name="clientId" defaultValue={event?.client_id ?? 'none'} className={selectClass}>
                <option value="none">— nenavázáno —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Technika (LED, zvuk, světla…)</Label><Input name="techNotes" defaultValue={event?.tech_notes || ''} placeholder="LED: horní 1920×128, střed 1280×384…" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis / poznámky</Label><Input name="description" defaultValue={event?.description || ''} /></div>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={pending}>{pending ? 'Ukládám…' : isEdit ? 'Uložit' : 'Založit'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
