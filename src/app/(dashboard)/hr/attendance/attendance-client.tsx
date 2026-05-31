'use client'

import { useTransition } from 'react'
import { LogIn, LogOut, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { clockIn, clockOut } from '../actions'

const time = (t: string | null) => (t ? new Date(t).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : '—')
const dateStr = (d: string) => new Date(d).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' })

function hours(inT: string | null, outT: string | null) {
  if (!inT || !outT) return '—'
  const mins = Math.max(0, Math.round((new Date(outT).getTime() - new Date(inT).getTime()) / 60000))
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
}

export function AttendanceClient({ todayRow, myMonth, team, canManage }: {
  todayRow: any | null; myMonth: any[]; team: any[]; canManage: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const hasIn = !!todayRow?.clock_in
  const hasOut = !!todayRow?.clock_out

  function act(fn: () => Promise<{ error?: string }>, ok: string) {
    startTransition(async () => {
      const res = await fn()
      if (res?.error) toast.error('Chyba', res.error); else toast.success(ok)
    })
  }

  return (
    <div className="space-y-6">
      {/* Clock widget */}
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock className="size-5" /></span>
          <div>
            <div className="text-sm font-medium text-foreground">Dnešní docházka</div>
            <div className="text-sm tabular-nums text-muted-foreground">
              Příchod {time(todayRow?.clock_in)} · Odchod {time(todayRow?.clock_out)}
              {hasIn && <span className="ml-2 text-foreground">({hours(todayRow?.clock_in, todayRow?.clock_out)})</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="lg" disabled={isPending || hasIn} onClick={() => act(clockIn, 'Příchod zaznamenán')}><LogIn className="size-4" />Příchod</Button>
          <Button size="lg" variant="outline" disabled={isPending || !hasIn || hasOut} onClick={() => act(clockOut, 'Odchod zaznamenán')}><LogOut className="size-4" />Odchod</Button>
        </div>
      </div>

      {/* Team today (manager+) */}
      {canManage && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Tým dnes</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {team.length === 0 ? (
              <EmptyState icon={Users} title="Zatím nikdo nezaznamenal docházku" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Zaměstnanec</TableHead><TableHead>Příchod</TableHead><TableHead>Odchod</TableHead><TableHead className="text-right">Hodiny</TableHead><TableHead>Stav</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="flex items-center gap-2"><Avatar name={r.name} className="size-7" />{r.name}</div></TableCell>
                      <TableCell className="tabular-nums">{time(r.clock_in)}</TableCell>
                      <TableCell className="tabular-nums">{time(r.clock_out)}</TableCell>
                      <TableCell className="text-right tabular-nums">{hours(r.clock_in, r.clock_out)}</TableCell>
                      <TableCell><Badge variant={r.clock_out ? 'secondary' : r.clock_in ? 'success' : 'outline'}>{r.clock_out ? 'Odešel' : r.clock_in ? 'V práci' : '—'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      )}

      {/* My month */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Tento měsíc</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {myMonth.length === 0 ? (
            <EmptyState icon={Clock} title="Žádné záznamy" description="Tento měsíc zatím nemáte žádnou docházku." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Datum</TableHead><TableHead>Příchod</TableHead><TableHead>Odchod</TableHead><TableHead className="text-right">Hodiny</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {myMonth.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-foreground">{dateStr(r.work_date)}</TableCell>
                    <TableCell className="tabular-nums">{time(r.clock_in)}</TableCell>
                    <TableCell className="tabular-nums">{time(r.clock_out)}</TableCell>
                    <TableCell className="text-right tabular-nums">{hours(r.clock_in, r.clock_out)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  )
}
