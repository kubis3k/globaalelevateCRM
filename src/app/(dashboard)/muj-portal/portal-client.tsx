'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, Wallet, Plane, CalendarClock, Check, X, ChevronLeft, ChevronRight, MapPin, Plus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { setAssignmentStatus, claimOpenShift, requestLeave } from '../hr/actions'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const DOW = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)
const t5 = (t: any) => (t ? String(t).slice(0, 5) : '')
const LEAVE_LABELS: Record<string, string> = { vacation: 'Dovolená', sick: 'Nemoc', personal: 'Osobní volno', unpaid: 'Neplacené volno' }
const LEAVE_STATUS: Record<string, { label: string; variant: 'info' | 'success' | 'secondary' }> = { pending: { label: 'Čeká na schválení', variant: 'info' }, approved: { label: 'Schváleno', variant: 'success' }, rejected: { label: 'Zamítnuto', variant: 'secondary' } }
const ASG: Record<string, { label: string; variant: 'info' | 'success' | 'secondary' }> = { assigned: { label: 'Přiřazeno', variant: 'info' }, confirmed: { label: 'Potvrzeno', variant: 'success' }, declined: { label: 'Odmítnuto', variant: 'secondary' } }

function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function mondayOf(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x }
function hoursOf(s: any) { if (!s.start_time || !s.end_time) return 0; const p = (t: any) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0) }; let mins = p(s.end_time) - p(s.start_time); if (mins < 0) mins += 1440; return mins / 60 }
function eachDay(start: string, end: string) { const out: string[] = []; const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00'); for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(iso(d)); return out }

type Shift = any

export function PortalClient({ shifts, openShifts, leave, balance, hourly, hourlyRate }: {
  shifts: Shift[]; openShifts: Shift[]; leave: any[]; balance: { annual: number; used: number; pending: number; remaining: number }; hourly: boolean; hourlyRate: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(iso(now))

  const active = (s: Shift) => s.status !== 'declined'
  const byDay = useMemo(() => {
    const m: Record<string, Shift[]> = {}
    for (const s of shifts) (m[s.work_date] ||= []).push(s)
    return m
  }, [shifts])
  const leaveDays = useMemo(() => {
    const set = new Set<string>()
    for (const l of leave) if (l.status !== 'rejected') for (const d of eachDay(l.start_date, l.end_date)) set.add(d)
    return set
  }, [leave])

  const stats = useMemo(() => {
    const ws = iso(mondayOf(now)), we = iso(addDays(mondayOf(now), 6))
    const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const week = shifts.filter((s) => active(s) && s.work_date >= ws && s.work_date <= we)
    const month = shifts.filter((s) => active(s) && s.work_date.startsWith(mk))
    const weekHours = week.reduce((a, s) => a + hoursOf(s), 0)
    const monthHours = month.reduce((a, s) => a + hoursOf(s), 0)
    const upcoming = shifts.filter((s) => active(s) && s.work_date >= iso(now)).length
    return { weekHours, monthHours, upcoming }
  }, [shifts]) // eslint-disable-line react-hooks/exhaustive-deps

  function act(p: Promise<{ error?: string }>, ok: string) {
    startTransition(async () => { const r = await p; if (r?.error) toast.error('Chyba', r.error); else { toast.success(ok); router.refresh() } })
  }
  function submitLeave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    startTransition(async () => {
      const r = await requestLeave(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success('Žádost odeslána ke schválení'); form.reset(); router.refresh()
    })
  }

  // calendar matrix (6 weeks, Mon-first)
  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = addDays(first, -((first.getDay() + 6) % 7))
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  }, [cursor])
  const daySel = byDay[selected] || []

  const h1 = (n: number) => n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tento týden" value={`${h1(stats.weekHours)} h`} hint={hourly && hourlyRate ? `≈ ${czk(stats.weekHours * hourlyRate)}` : 'odpracované hodiny'} icon={<Clock className="size-4" />} />
        <StatCard title="Tento měsíc" value={`${h1(stats.monthHours)} h`} hint={hourly && hourlyRate ? `≈ ${czk(stats.monthHours * hourlyRate)}` : 'odpracované hodiny'} icon={<Wallet className="size-4" />} />
        <StatCard title="Zůstatek dovolené" value={`${h1(balance.remaining)} dní`} hint={`z ${balance.annual} · čerpáno ${h1(balance.used)}${balance.pending ? ` · čeká ${h1(balance.pending)}` : ''}`} icon={<Plane className="size-4" />} />
        <StatCard title="Nadcházející směny" value={String(stats.upcoming)} hint="potvrď je v kalendáři" icon={<CalendarClock className="size-4" />} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/personal" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><User className="size-4" />Osobní sektor</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Calendar + day detail */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => { setCursor(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(iso(now)) }}>Dnes</Button>
                <Button variant="outline" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {DOW.map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.flat().map((dt) => {
                const k = iso(dt)
                const inMonth = dt.getMonth() === cursor.getMonth()
                const has = (byDay[k] || []).length > 0
                const onLeave = leaveDays.has(k)
                const isToday = k === iso(now)
                const isSel = k === selected
                return (
                  <button key={k} onClick={() => setSelected(k)}
                    className={cn('relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition-colors',
                      !inMonth && 'opacity-35',
                      isSel ? 'bg-primary text-primary-foreground' : onLeave ? 'bg-amber-400/15 text-foreground' : 'hover:bg-muted text-foreground',
                      isToday && !isSel && 'ring-1 ring-primary')}>
                    {dt.getDate()}
                    {has && <span className={cn('mt-0.5 size-1.5 rounded-full', isSel ? 'bg-primary-foreground' : 'bg-primary')} />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Směny — {new Date(selected + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            {daySel.length === 0 ? (
              <p className="text-sm text-muted-foreground">{leaveDays.has(selected) ? 'Tento den máš volno.' : 'Žádné směny tento den.'}</p>
            ) : (
              <div className="space-y-2">
                {daySel.map((s) => (
                  <div key={s.shift_id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground">{t5(s.start_time)}–{t5(s.end_time)} · {s.role || 'Směna'}</div>
                      <Badge variant={ASG[s.status]?.variant || 'info'}>{ASG[s.status]?.label || s.status}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {hoursOf(s) > 0 && <span>{h1(hoursOf(s))} h{hourly && hourlyRate ? ` · ≈ ${czk(hoursOf(s) * hourlyRate)}` : ''}</span>}
                      {s.project && <span> · {s.project}</span>}
                      {s.location && <span> · <MapPin className="inline size-3" />{s.location}</span>}
                    </div>
                    {s.status !== 'declined' && (
                      <div className="mt-2 flex gap-1.5">
                        {s.status !== 'confirmed' && <Button size="sm" disabled={pending} onClick={() => act(setAssignmentStatus(s.id, 'confirmed'), 'Potvrzeno')}><Check className="size-3.5" />Potvrdit</Button>}
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(setAssignmentStatus(s.id, 'declined'), 'Odmítnuto')}><X className="size-3.5" />Nemůžu</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: open shifts + leave */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Otevřené směny</h3>
            {openShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné volné směny k přihlášení.</p>
            ) : (
              <div className="space-y-2">
                {openShifts.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{new Date(s.work_date + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {t5(s.start_time)}–{t5(s.end_time)}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.role || 'Směna'}{s.project ? ` · ${s.project}` : ''} · volno {s.free}</div>
                    </div>
                    <Button size="sm" disabled={pending} onClick={() => act(claimOpenShift(s.id), 'Přihlášeno')}>Beru</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Žádost o volno</h3>
            <form onSubmit={submitLeave} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1"><Label className="text-xs text-muted-foreground">Typ</Label>
                  <select name="type" defaultValue="vacation" className={selectClass}>{Object.entries(LEAVE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Od</Label><Input type="date" name="startDate" required /></div>
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Do</Label><Input type="date" name="endDate" required /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Důvod (nepovinné)</Label><Input name="reason" placeholder="např. rodinná dovolená" /></div>
              <Button type="submit" size="sm" className="w-full" disabled={pending}><Plus className="size-4" />Odeslat žádost</Button>
            </form>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Moje žádosti</h3>
            {leave.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatím žádné žádosti.</p>
            ) : (
              <div className="space-y-1.5">
                {leave.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-foreground">{LEAVE_LABELS[l.type] || l.type} · {h1(Number(l.working_days || 0))} dní</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{new Date(l.start_date).toLocaleDateString('cs-CZ')} – {new Date(l.end_date).toLocaleDateString('cs-CZ')}</div>
                    </div>
                    <Badge variant={(LEAVE_STATUS[l.status] || LEAVE_STATUS.pending).variant}>{(LEAVE_STATUS[l.status] || LEAVE_STATUS.pending).label}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
