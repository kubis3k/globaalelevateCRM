'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, X, ChevronLeft, ChevronRight, Check, CalendarClock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveShift, deleteShift, assignToShift, removeAssignment, setAssignmentStatus, claimOpenShift } from '../actions'

const selectClass = 'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const DOW = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)
const t5 = (t: any) => (t ? String(t).slice(0, 5) : '')
function mondayOf(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function hoursOf(s: any) { if (!s.start_time || !s.end_time) return 0; const p = (t: any) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0) }; let mins = p(s.end_time) - p(s.start_time); if (mins < 0) mins += 1440; return mins / 60 }
const ASG: Record<string, { label: string; variant: 'info' | 'success' | 'secondary' }> = { assigned: { label: 'Přiřazeno', variant: 'info' }, confirmed: { label: 'Potvrzeno', variant: 'success' }, declined: { label: 'Odmítnuto', variant: 'secondary' } }

type Emp = { user_id: string; name: string; hourly_rate: number; position?: string }

export function HrShiftsClient({ shifts, employees, projects, canManage, currentUserId }: {
  shifts: any[]; employees: Emp[]; projects: any[]; canManage: boolean; currentUserId: string
}) {
  const [monday, setMonday] = useState(() => mondayOf(new Date()))
  const [dialog, setDialog] = useState<{ open: boolean; shift: any | null; date?: string }>({ open: false, shift: null })
  const [pending, startTransition] = useTransition()

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => iso(addDays(monday, i))), [monday])
  const projName = (id: string | null) => projects.find((p) => p.id === id)?.name || null
  const active = (s: any) => s.assignments.filter((a: any) => a.status !== 'declined')
  const shiftCost = (s: any) => hoursOf(s) * active(s).reduce((sum: number, a: any) => sum + Number(a.rate || 0), 0)
  const weekShifts = shifts.filter((s) => week.includes(s.work_date))
  const weekCost = weekShifts.reduce((a, s) => a + shiftCost(s), 0)
  const rangeLabel = `${addDays(monday, 0).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} – ${addDays(monday, 6).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}`

  function act(fn: Promise<{ error?: string }>, ok?: string) {
    startTransition(async () => { const r = await fn; if (r?.error) toast.error('Chyba', r.error); else if (ok) toast.success(ok) })
  }
  function removeShift(s: any) {
    confirmDialog({ title: 'Smazat směnu?', description: `${s.work_date} ${t5(s.start_time)} ${s.role || ''}`, confirmLabel: 'Smazat', destructive: true }).then((okc) => { if (okc) act(deleteShift(s.id), 'Smazáno') })
  }

  const Nav = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={() => setMonday(addDays(monday, -7))}><ChevronLeft className="size-4" /></Button>
      <span className="min-w-28 text-center text-sm font-medium text-foreground">{rangeLabel}</span>
      <Button variant="outline" size="icon-sm" onClick={() => setMonday(addDays(monday, 7))}><ChevronRight className="size-4" /></Button>
      <Button variant="ghost" size="sm" onClick={() => setMonday(mondayOf(new Date()))}>Tento týden</Button>
      {canManage && <span className="text-xs text-muted-foreground">Mzdové náklady týdne: <b className="text-foreground">{czk(weekCost)}</b></span>}
    </div>
  )

  // ── Employee self-service view ──
  if (!canManage) {
    const mine = weekShifts.map((s) => ({ s, a: s.assignments.find((x: any) => x.user_id === currentUserId) })).filter((x) => x.a)
    const open = weekShifts.filter((s) => active(s).length < (s.required_count || 1) && !s.assignments.some((a: any) => a.user_id === currentUserId))
    return (
      <div className="space-y-5">
        {Nav}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Moje směny</h3>
          {mine.length === 0 ? <p className="text-sm text-muted-foreground">Tento týden nemáš žádné směny.</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {mine.map(({ s, a }) => (
                <div key={s.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between"><div className="font-medium text-foreground">{new Date(s.work_date).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {t5(s.start_time)}–{t5(s.end_time)}</div><Badge variant={ASG[a.status].variant}>{ASG[a.status].label}</Badge></div>
                  <div className="text-sm text-muted-foreground">{s.role || 'Směna'}{projName(s.project_id) ? ` · ${projName(s.project_id)}` : ''}{s.location ? ` · ${s.location}` : ''}</div>
                  {a.status !== 'confirmed' && <Button size="sm" className="mt-2" disabled={pending} onClick={() => act(setAssignmentStatus(a.id, 'confirmed'), 'Potvrzeno')}><Check className="size-4" />Potvrdit</Button>}
                  {a.status !== 'declined' && <Button size="sm" variant="ghost" className="mt-2 ml-1" disabled={pending} onClick={() => act(setAssignmentStatus(a.id, 'declined'), 'Odmítnuto')}>Odmítnout</Button>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Otevřené směny</h3>
          {open.length === 0 ? <p className="text-sm text-muted-foreground">Žádné volné směny tento týden.</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {open.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div><div className="font-medium text-foreground">{new Date(s.work_date).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })} · {t5(s.start_time)}–{t5(s.end_time)}</div>
                    <div className="text-sm text-muted-foreground">{s.role || 'Směna'}{projName(s.project_id) ? ` · ${projName(s.project_id)}` : ''} · volno {(s.required_count || 1) - active(s).length}</div></div>
                  <Button size="sm" disabled={pending} onClick={() => act(claimOpenShift(s.id), 'Přihlášeno')}>Přihlásit se</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Manager rota ──
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {Nav}
        <Button onClick={() => setDialog({ open: true, shift: null, date: week[0] })}><Plus className="size-4" />Přidat směnu</Button>
      </div>

      {weekShifts.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Žádné směny v tomto týdnu" description="Přidej směnu — můžeš ji navázat na akci (projekt) a obsadit lidmi." />
      ) : (
        <div className="space-y-4">
          {week.map((d) => {
            const day = shifts.filter((s) => s.work_date === d)
            if (!day.length) return null
            return (
              <div key={d}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{DOW[(new Date(d).getDay() + 6) % 7]} {new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}</span>
                  <button onClick={() => setDialog({ open: true, shift: null, date: d })} className="text-xs text-muted-foreground hover:text-foreground">+ směna</button>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {day.map((s) => {
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
                            <span key={a.id} className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs', a.status === 'declined' ? 'bg-muted text-muted-foreground line-through' : a.status === 'confirmed' ? 'bg-success/15 text-success' : 'bg-primary/10 text-foreground')}>
                              {a.name}
                              <button onClick={() => act(removeAssignment(a.id), 'Odebráno')} className="hover:text-destructive"><X className="size-3" /></button>
                            </span>
                          ))}
                        </div>
                        {free.length > 0 && (
                          <div className="mt-2 flex gap-1.5">
                            <select id={`asg-${s.id}`} defaultValue="" className={cn(selectClass, 'flex-1')}>
                              <option value="" disabled>+ přiřadit…</option>
                              {free.map((e) => <option key={e.user_id} value={e.user_id}>{e.name}{e.position ? ` (${e.position})` : ''}</option>)}
                            </select>
                            <Button size="sm" variant="outline" disabled={pending} onClick={() => {
                              const el = document.getElementById(`asg-${s.id}`) as HTMLSelectElement | null
                              if (el?.value) act(assignToShift(s.id, el.value), 'Přiřazeno')
                            }}>Přidat</Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

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
          <DialogDescription>Datum, čas a role; volitelně navázání na akci a počet lidí.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={shift.id} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="workDate" defaultValue={shift?.work_date || date || ''} required /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Počet lidí</Label><Input type="number" min={1} name="requiredCount" defaultValue={shift?.required_count ?? 1} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Od</Label><Input type="time" name="startTime" defaultValue={t5(shift?.start_time) || '18:00'} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Do</Label><Input type="time" name="endTime" defaultValue={t5(shift?.end_time) || '02:00'} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Role</Label><Input name="role" defaultValue={shift?.role || ''} placeholder="Barman, Security…" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Místo</Label><Input name="location" defaultValue={shift?.location || ''} placeholder="Hlavní bar…" /></div>
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
