'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Edit2, X, ChevronLeft, ChevronRight, Check, CalendarClock, MapPin, IdCard, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveShift, deleteShift, assignToShift, removeAssignment, reviewDecline, verifyWorked } from '../actions'

const selectClass = 'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const DOW = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)
const t5 = (t: any) => (t ? String(t).slice(0, 5) : '')
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function hoursOf(s: any) { if (!s.start_time || !s.end_time) return 0; const p = (t: any) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0) }; let mins = p(s.end_time) - p(s.start_time); if (mins < 0) mins += 1440; return mins / 60 }
const ASG: Record<string, { label: string; cls: string }> = {
  assigned: { label: 'Čeká na potvrzení', cls: 'bg-primary/10 text-foreground' },
  confirmed: { label: 'Potvrzeno', cls: 'bg-success/15 text-success' },
  decline_requested: { label: 'Odmítnutí ke schválení', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  declined: { label: 'Odmítnuto', cls: 'bg-muted text-muted-foreground line-through' },
}

type Emp = { user_id: string; name: string; hourly_rate: number; position?: string }

export function HrShiftsClient({ shifts, employees, projects, canManage, currentUserId }: {
  shifts: any[]; employees: Emp[]; projects: any[]; canManage: boolean; currentUserId: string
}) {
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(iso(now))
  const [dialog, setDialog] = useState<{ open: boolean; shift: any | null; date?: string }>({ open: false, shift: null })
  const [pending, startTransition] = useTransition()

  const projName = (id: string | null) => projects.find((p) => p.id === id)?.name || null
  const active = (s: any) => s.assignments.filter((a: any) => a.status !== 'declined')
  const shiftCost = (s: any) => hoursOf(s) * active(s).reduce((sum: number, a: any) => sum + Number(a.rate || 0), 0)

  function act(fn: Promise<{ error?: string }>, ok?: string) {
    startTransition(async () => { const r = await fn; if (r?.error) toast.error('Chyba', r.error); else if (ok) toast.success(ok) })
  }
  function removeShift(s: any) {
    confirmDialog({ title: 'Smazat směnu?', description: `${s.work_date} ${t5(s.start_time)} ${s.role || ''}`, confirmLabel: 'Smazat', destructive: true }).then((okc) => { if (okc) act(deleteShift(s.id), 'Smazáno') })
  }

  // ── Employee → portál ──
  if (!canManage) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <IdCard className="mx-auto size-8 text-muted-foreground" />
        <h3 className="mt-2 font-medium text-foreground">Tvoje směny najdeš v Můj portál</h3>
        <p className="mt-1 text-sm text-muted-foreground">Tam je kalendář směn, potvrzení/odmítnutí i docházka (odpracované hodiny).</p>
        <Link href="/muj-portal" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Otevřít Můj portál</Link>
      </div>
    )
  }

  // ── Manager calendar + approvals ──
  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = addDays(first, -((first.getDay() + 6) % 7))
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  }, [cursor])
  const byDay = useMemo(() => { const m: Record<string, any[]> = {}; for (const s of shifts) (m[s.work_date] ||= []).push(s); return m }, [shifts])
  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
  const monthCost = shifts.filter((s) => s.work_date.startsWith(monthKey)).reduce((a, s) => a + shiftCost(s), 0)

  // approvals
  const declineReqs: { a: any; s: any }[] = []
  const workedReps: { a: any; s: any }[] = []
  for (const s of shifts) for (const a of s.assignments) {
    if (a.status === 'decline_requested') declineReqs.push({ a, s })
    if (a.worked_status === 'reported') workedReps.push({ a, s })
  }
  const daySel = byDay[selected] || []

  return (
    <div className="space-y-5">
      {/* Approvals */}
      {(declineReqs.length > 0 || workedReps.length > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><ClipboardCheck className="size-4" />Ke schválení</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {declineReqs.map(({ a, s }) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="font-medium text-foreground">{a.name} — odmítá směnu</div>
                <div className="text-xs text-muted-foreground">{new Date(s.work_date).toLocaleDateString('cs-CZ')} {t5(s.start_time)}–{t5(s.end_time)} · {s.role || 'Směna'}</div>
                {a.decline_reason && <div className="mt-1 rounded bg-muted/50 p-2 text-xs text-foreground">„{a.decline_reason}"</div>}
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" disabled={pending} onClick={() => act(reviewDecline(a.id, true), 'Odmítnutí schváleno')}>Schválit odmítnutí</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => act(reviewDecline(a.id, false), 'Vráceno k potvrzení')}>Zamítnout</Button>
                </div>
              </div>
            ))}
            {workedReps.map(({ a, s }) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="font-medium text-foreground">{a.name} — odpracoval(a) směnu</div>
                <div className="text-xs text-muted-foreground">{new Date(s.work_date).toLocaleDateString('cs-CZ')} {t5(s.start_time)}–{t5(s.end_time)} · {s.role || 'Směna'} · {hoursOf(s).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} h</div>
                {a.worked_note && <div className="mt-1 rounded bg-muted/50 p-2 text-xs text-foreground">„{a.worked_note}"</div>}
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" disabled={pending} onClick={() => act(verifyWorked(a.id, true), 'Ověřeno')}><Check className="size-3.5" />Ověřit</Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => act(verifyWorked(a.id, false), 'Neuznáno')}>Neuznat</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-28 text-center text-sm font-semibold text-foreground">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => { setCursor(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(iso(now)) }}>Dnes</Button>
            <span className="text-xs text-muted-foreground">Mzdové náklady měsíce: <b className="text-foreground">{czk(monthCost)}</b></span>
          </div>
          <Button onClick={() => setDialog({ open: true, shift: null, date: selected })}><Plus className="size-4" />Přidat směnu</Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">{DOW.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((dt) => {
            const k = iso(dt); const inMonth = dt.getMonth() === cursor.getMonth(); const list = byDay[k] || []
            const understaffed = list.some((s) => active(s).length < (s.required_count || 1))
            const isSel = k === selected; const isToday = k === iso(now)
            return (
              <button key={k} onClick={() => setSelected(k)}
                className={cn('relative flex h-14 flex-col items-center justify-start rounded-lg p-1 text-sm transition-colors',
                  !inMonth && 'opacity-35', isSel ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted', isToday && !isSel && 'ring-1 ring-primary')}>
                <span>{dt.getDate()}</span>
                {list.length > 0 && <span className={cn('mt-0.5 rounded-full px-1.5 text-[10px] font-medium', isSel ? 'bg-primary-foreground/20' : understaffed ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-primary/15 text-primary')}>{list.length}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{new Date(selected + 'T00:00:00').toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, shift: null, date: selected })}><Plus className="size-4" />Směna</Button>
        </div>
        {daySel.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Žádné směny tento den" description="Přidej směnu, navaž ji na akci a obsaď lidmi." />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {daySel.map((s) => {
              const act0 = active(s); const understaffed = act0.length < (s.required_count || 1)
              const free = employees.filter((e) => !s.assignments.some((a: any) => a.user_id === e.user_id))
              return (
                <div key={s.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{t5(s.start_time)}–{t5(s.end_time)} · {s.role || 'Směna'}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {projName(s.project_id) && <span>{projName(s.project_id)} · </span>}
                        {s.location && <span><MapPin className="mr-0.5 inline size-3" />{s.location} · </span>}
                        {hoursOf(s).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} h · {czk(shiftCost(s))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={understaffed ? 'secondary' : 'success'}>{act0.length}/{s.required_count || 1}</Badge>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ open: true, shift: s })}><Edit2 className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeShift(s)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.assignments.map((a: any) => (
                      <span key={a.id} className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs', (ASG[a.status] || ASG.assigned).cls)} title={(ASG[a.status] || ASG.assigned).label}>
                        {a.name}
                        {a.worked_status === 'verified' && <Check className="size-3 text-success" />}
                        {a.worked_status === 'reported' && <span className="text-[9px]">⏳</span>}
                        <button onClick={() => act(removeAssignment(a.id), 'Odebráno')} className="hover:text-destructive"><X className="size-3" /></button>
                      </span>
                    ))}
                    {act0.length === 0 && <span className="text-xs text-muted-foreground">neobsazeno</span>}
                  </div>
                  {free.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                      <select id={`asg-${s.id}`} defaultValue="" className={cn(selectClass, 'flex-1')}>
                        <option value="" disabled>+ přiřadit zaměstnance…</option>
                        {free.map((e) => <option key={e.user_id} value={e.user_id}>{e.name}{e.position ? ` (${e.position})` : ''}</option>)}
                      </select>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => {
                        const el = document.getElementById(`asg-${s.id}`) as HTMLSelectElement | null
                        if (el?.value) act(assignToShift(s.id, el.value), 'Přiřazeno — čeká na potvrzení')
                      }}>Přidat</Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {dialog.open && <ShiftDialog shift={dialog.shift} date={dialog.date} projects={projects} onClose={() => setDialog({ open: false, shift: null })} />}
    </div>
  )
}

function ShiftDialog({ shift, date, projects, onClose }: { shift: any | null; date?: string; projects: any[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!shift
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const r = await saveShift(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success(isEdit ? 'Směna uložena' : 'Směna přidána'); onClose() } })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit směnu' : 'Nová směna'}</DialogTitle>
          <DialogDescription>Datum, čas, role a místo; volitelně navázání na akci. Lidi obsadíš po uložení.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={shift.id} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="workDate" defaultValue={shift?.work_date || date || ''} required /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Počet lidí</Label><Input type="number" min={1} name="requiredCount" defaultValue={shift?.required_count ?? 1} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Od</Label><Input type="time" name="startTime" defaultValue={t5(shift?.start_time) || '18:00'} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Do</Label><Input type="time" name="endTime" defaultValue={t5(shift?.end_time) || '02:00'} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Role</Label><Input name="role" defaultValue={shift?.role || ''} placeholder="Barman, Security…" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Místo konání</Label><Input name="location" defaultValue={shift?.location || ''} placeholder="Hlavní bar / OX Club…" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Akce / projekt</Label>
              <select name="projectId" defaultValue={shift?.project_id || 'none'} className={cn(selectClass, 'h-9 w-full')}>
                <option value="none">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" defaultValue={shift?.note || ''} /></div>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={pending}>{pending ? 'Ukládám…' : isEdit ? 'Uložit' : 'Přidat'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
