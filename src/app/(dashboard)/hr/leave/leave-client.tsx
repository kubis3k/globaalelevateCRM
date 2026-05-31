'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, X, Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { requestLeave, reviewLeave, cancelLeave } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const TYPE_LABELS: Record<string, string> = { vacation: 'Dovolená', sick: 'Nemoc', personal: 'Osobní volno', unpaid: 'Neplacené volno' }
const STATUS: Record<string, { variant: 'warning' | 'success' | 'destructive'; label: string }> = {
  pending: { variant: 'warning', label: 'Čeká' },
  approved: { variant: 'success', label: 'Schváleno' },
  rejected: { variant: 'destructive', label: 'Zamítnuto' },
}
const fmt = (d: string) => new Date(d).toLocaleDateString('cs-CZ')

export function LeaveClient({ mine, pending, canManage, entitlement, used }: {
  mine: any[]; pending: any[]; canManage: boolean; entitlement: number; used: number
}) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const remaining = Math.max(0, entitlement - used)

  function review(id: string, decision: 'approved' | 'rejected') {
    startTransition(async () => {
      const res = await reviewLeave(id, decision)
      if (res?.error) toast.error('Chyba', res.error)
      else toast.success(decision === 'approved' ? 'Žádost schválena' : 'Žádost zamítnuta')
    })
  }

  async function cancel(r: any) {
    const ok = await confirmDialog({ title: 'Zrušit žádost?', description: `${TYPE_LABELS[r.type]} ${fmt(r.start_date)} – ${fmt(r.end_date)}`, confirmLabel: 'Zrušit žádost', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await cancelLeave(r.id)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Žádost zrušena')
    })
  }

  return (
    <div className="space-y-6">
      {/* Balance + action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Nárok / rok" value={`${entitlement}`} />
          <Stat label="Vyčerpáno" value={`${used}`} />
          <Stat label="Zbývá" value={`${remaining}`} accent />
        </div>
        <Button size="lg" onClick={() => setShowForm(true)}><Plus className="size-4" />Požádat o volno</Button>
      </div>

      {/* Approvals queue (manager+) */}
      {canManage && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Ke schválení {pending.length > 0 && <Badge variant="warning" className="ml-1">{pending.length}</Badge>}</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {pending.length === 0 ? (
              <EmptyState icon={Check} title="Žádné čekající žádosti" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zaměstnanec</TableHead><TableHead>Typ</TableHead><TableHead>Termín</TableHead>
                    <TableHead className="text-right">Dny</TableHead><TableHead>Důvod</TableHead><TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="flex items-center gap-2"><Avatar name={r.name} className="size-7" />{r.name}</div></TableCell>
                      <TableCell>{TYPE_LABELS[r.type]}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{fmt(r.start_date)} – {fmt(r.end_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.working_days}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.reason || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label="Schválit" disabled={isPending} className="text-muted-foreground hover:text-success" onClick={() => review(r.id, 'approved')}><Check className="size-4" /></Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Zamítnout" disabled={isPending} className="text-muted-foreground hover:text-destructive" onClick={() => review(r.id, 'rejected')}><X className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      )}

      {/* My requests */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Moje žádosti</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {mine.length === 0 ? (
            <EmptyState icon={Plane} title="Žádné žádosti" description="Zatím jste nepožádali o volno." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead><TableHead>Termín</TableHead><TableHead className="text-right">Dny</TableHead>
                  <TableHead>Stav</TableHead><TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mine.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.pending
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-foreground">{TYPE_LABELS[r.type]}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{fmt(r.start_date)} – {fmt(r.end_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.working_days}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        {(r.status === 'pending' || canManage) && (
                          <Button variant="ghost" size="icon-sm" aria-label="Zrušit" disabled={isPending} className="text-muted-foreground hover:text-destructive" onClick={() => cancel(r)}><X className="size-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {showForm && <LeaveForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 shadow-xs ring-1 ring-foreground/10">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-semibold tabular-nums', accent && 'text-primary')}>{value}</div>
    </div>
  )
}

function LeaveForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await requestLeave(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success('Žádost odeslána')
      onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Žádost o volno</DialogTitle>
          <DialogDescription>Vyplňte typ a termín. Žádost půjde ke schválení.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Typ</Label>
            <select name="type" defaultValue="vacation" className={selectClass}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Od</Label><Input type="date" name="startDate" required /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Do</Label><Input type="date" name="endDate" required /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Důvod (volitelné)</Label><Input name="reason" placeholder="Krátká poznámka…" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Odesílám…' : 'Odeslat žádost'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
