'use client'

import { useMemo, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveEvent, deleteEvent } from '../actions'

type Ev = { id: string; title: string; description: string | null; start_time: string; end_time: string; all_day: boolean }

const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

export function PersonalCalendarClient({ events }: { events: Ev[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [dialog, setDialog] = useState<{ event?: Ev; date?: string } | null>(null)

  const byDay = useMemo(() => {
    const m = new Map<string, Ev[]>()
    for (const e of events) {
      const k = keyOf(new Date(e.start_time))
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    }
    return m
  }, [events])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const lead = (first.getDay() + 6) % 7 // Monday = 0
    const days = new Date(year, month + 1, 0).getDate()
    const arr: ({ day: number; key: string } | null)[] = []
    for (let i = 0; i < lead; i++) arr.push(null)
    for (let d = 1; d <= days; d++) arr.push({ day: d, key: keyOf(new Date(year, month, d)) })
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  const todayKey = keyOf(new Date())
  function shift(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Předchozí měsíc" onClick={() => shift(-1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="icon" aria-label="Další měsíc" onClick={() => shift(1)}><ChevronRight className="size-4" /></Button>
          <h2 className="ml-1 text-base font-semibold text-foreground">{MONTHS[month]} {year}</h2>
          <Button variant="ghost" size="sm" onClick={goToday}>Dnes</Button>
        </div>
        <Button size="lg" onClick={() => setDialog({ date: todayKey })}><Plus className="size-4" />Nová událost</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((w) => <div key={w} className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="min-h-[88px] border-b border-r border-border bg-muted/20" />
            const dayEvents = byDay.get(c.key) || []
            const isToday = c.key === todayKey
            return (
              <button key={i} onClick={() => setDialog({ date: c.key })}
                className="group min-h-[88px] border-b border-r border-border p-1 text-left align-top transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/60">
                <div className={cn('mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs', isToday ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground')}>{c.day}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); setDialog({ event: e }) }}
                      className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/20">
                      {!e.all_day && <span className="tabular-nums opacity-70">{timeOf(e.start_time)} </span>}{e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="px-1.5 text-[11px] text-muted-foreground">+{dayEvents.length - 3} další</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {dialog && <EventDialog event={dialog.event} date={dialog.date} onClose={() => setDialog(null)} />}
    </div>
  )
}

function EventDialog({ event, date, onClose }: { event?: Ev; date?: string; onClose: () => void }) {
  const init = event ? new Date(event.start_time) : null
  const [title, setTitle] = useState(event?.title || '')
  const [desc, setDesc] = useState(event?.description || '')
  const [day, setDay] = useState(event ? keyOf(new Date(event.start_time)) : (date || keyOf(new Date())))
  const [allDay, setAllDay] = useState(event?.all_day || false)
  const [start, setStart] = useState(init && !event?.all_day ? `${pad(init.getHours())}:${pad(init.getMinutes())}` : '09:00')
  const [end, setEnd] = useState(() => {
    if (event && !event.all_day) { const e = new Date(event.end_time); return `${pad(e.getHours())}:${pad(e.getMinutes())}` }
    return '10:00'
  })
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('Chyba', 'Zadejte název události.'); return }
    const fd = new FormData()
    if (event) fd.set('id', event.id)
    fd.set('title', title)
    fd.set('description', desc)
    fd.set('allDay', allDay ? 'true' : 'false')
    if (allDay) { fd.set('startTime', `${day}T00:00`); fd.set('endTime', `${day}T23:59`) }
    else { fd.set('startTime', `${day}T${start}`); fd.set('endTime', `${day}T${end}`) }
    startTransition(async () => {
      const res = await saveEvent(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(event ? 'Uloženo' : 'Událost vytvořena')
      onClose()
    })
  }

  async function remove() {
    if (!event) return
    const ok = await confirmDialog({ title: 'Smazat událost?', description: 'Událost bude trvale odstraněna.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteEvent(event.id)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success('Smazáno'); onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? 'Upravit událost' : 'Nová událost'}</DialogTitle>
          <DialogDescription>Soukromá událost v osobním kalendáři — odděleno od sdíleného.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Název události" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} required /></div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-4 rounded border-input" />
            Celý den
          </label>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Od</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Do</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Poznámka (volitelné)</Label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {event ? <Button type="button" variant="ghost" size="lg" className="text-muted-foreground hover:text-destructive" onClick={remove}><Trash2 className="size-4" />Smazat</Button> : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
              <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
