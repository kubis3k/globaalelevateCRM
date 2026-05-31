'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveEvent, deleteEvent } from '../actions'

type Ev = { id: string; title: string; description: string | null; start_time: string; end_time: string; all_day: boolean }
type SharedEv = { id: string; title: string; description: string | null; start_time: string; end_time: string }
type Item = { id: string; title: string; start: string; allDay: boolean; shared: boolean; ev?: Ev; sev?: SharedEv }

const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

export function PersonalCalendarClient({ events, shared }: { events: Ev[]; shared: SharedEv[] }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [dialog, setDialog] = useState<{ event?: Ev; date?: string } | null>(null)
  const [info, setInfo] = useState<SharedEv | null>(null)

  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>()
    const add = (k: string, it: Item) => { if (!m.has(k)) m.set(k, []); m.get(k)!.push(it) }
    for (const e of events) add(keyOf(new Date(e.start_time)), { id: e.id, title: e.title, start: e.start_time, allDay: e.all_day, shared: false, ev: e })
    for (const s of shared) add(keyOf(new Date(s.start_time)), { id: s.id, title: s.title, start: s.start_time, allDay: false, shared: true, sev: s })
    for (const arr of m.values()) arr.sort((a, b) => a.start.localeCompare(b.start))
    return m
  }, [events, shared])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const lead = (first.getDay() + 6) % 7
    const days = new Date(year, month + 1, 0).getDate()
    const arr: ({ day: number; key: string } | null)[] = []
    for (let i = 0; i < lead; i++) arr.push(null)
    for (let d = 1; d <= days; d++) arr.push({ day: d, key: keyOf(new Date(year, month, d)) })
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month])

  const todayKey = keyOf(new Date())
  function shift(delta: number) { const d = new Date(year, month + delta, 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }
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

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary/30" />Osobní</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400/40" />Přiřazené (sdílený kalendář)</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAYS.map((w) => <div key={w} className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="min-h-[88px] border-b border-r border-border bg-muted/20" />
            const items = byDay.get(c.key) || []
            const isToday = c.key === todayKey
            return (
              <button key={i} onClick={() => setDialog({ date: c.key })}
                className="group min-h-[88px] border-b border-r border-border p-1 text-left align-top transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/60">
                <div className={cn('mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs', isToday ? 'bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground')}>{c.day}</div>
                <div className="space-y-0.5">
                  {items.slice(0, 3).map((it) => (
                    <div key={(it.shared ? 's' : 'p') + it.id}
                      onClick={(ev) => { ev.stopPropagation(); it.shared ? setInfo(it.sev!) : setDialog({ event: it.ev }) }}
                      className={cn('truncate rounded px-1.5 py-0.5 text-[11px]',
                        it.shared ? 'bg-amber-400/20 text-amber-700 hover:bg-amber-400/30 dark:text-amber-300' : 'bg-primary/10 text-primary hover:bg-primary/20')}>
                      {!it.allDay && <span className="tabular-nums opacity-70">{timeOf(it.start)} </span>}{it.title}
                    </div>
                  ))}
                  {items.length > 3 && <div className="px-1.5 text-[11px] text-muted-foreground">+{items.length - 3} další</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {dialog && <EventDialog event={dialog.event} date={dialog.date} onClose={() => setDialog(null)} />}
      {info && <SharedInfoDialog event={info} onClose={() => setInfo(null)} />}
    </div>
  )
}

function SharedInfoDialog({ event, onClose }: { event: SharedEv; onClose: () => void }) {
  const range = `${new Date(event.start_time).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })} – ${timeOf(event.end_time)}`
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-amber-500" />{event.title}</DialogTitle>
          <DialogDescription>Přiřazeno tobě ze sdíleného firemního kalendáře.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="tabular-nums text-muted-foreground">{range}</div>
          {event.description && <p className="whitespace-pre-wrap text-foreground">{event.description}</p>}
          <p className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">Tato událost patří do sdíleného kalendáře — upravit ji můžeš tam.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={onClose}>Zavřít</Button>
            <Link href="/calendar" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Otevřít Kalendář</Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
