'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Check, X, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { createExpense, deleteExpense, reviewExpense } from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const STATUS: Record<string, { label: string; variant: 'info' | 'success' | 'destructive' }> = {
  pending: { label: 'Čeká', variant: 'info' },
  approved: { label: 'Schváleno', variant: 'success' },
  rejected: { label: 'Zamítnuto', variant: 'destructive' },
}

export function ExpensesClient({ claims, canReview, currentUserId }: { claims: any[]; canReview: boolean; currentUserId: string }) {
  const [showNew, setShowNew] = useState(false)
  const [isPending, start] = useTransition()
  const pending = claims.filter((c) => c.status === 'pending')
  const pendingTotal = pending.reduce((a, c) => a + Number(c.amount || 0), 0)

  function review(c: any, approve: boolean) {
    start(async () => { const res = await reviewExpense(c.id, approve); if (res?.error) toast.error('Chyba', res.error); else toast.success(approve ? 'Výdaj schválen' : 'Výdaj zamítnut') })
  }
  async function remove(c: any) {
    const ok = await confirmDialog({ title: 'Smazat výdaj?', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const res = await deleteExpense(c.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Výdaj smazán') })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{claims.length} výdajů · čeká na schválení <span className="font-semibold tabular-nums text-foreground">{pending.length}</span> ({czk(pendingTotal)})</p>
        <Button size="lg" onClick={() => setShowNew(true)}><Plus className="size-4" />Nový výdaj</Button>
      </div>

      {claims.length === 0 ? (
        <EmptyState icon={Coins} title="Žádné výdaje" description="Vytvoř první výdaj k proplacení." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Zaměstnanec</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Popis</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Částka</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((c) => {
                const st = STATUS[c.status] ?? STATUS.pending
                const isPendingRow = c.status === 'pending'
                const canDelete = isPendingRow && (canReview || c.user_id === currentUserId)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{new Date(c.expense_date).toLocaleDateString('cs-CZ')}</TableCell>
                    <TableCell className="text-muted-foreground">{c.claimant_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.category || '—'}</TableCell>
                    <TableCell className="max-w-[18rem] truncate text-foreground">{c.description || '—'}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">{czk(Number(c.amount), c.currency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {isPendingRow && canReview && <>
                          <Button variant="ghost" size="icon-xs" aria-label="Schválit" title="Schválit" className="text-success hover:text-success" disabled={isPending} onClick={() => review(c, true)}><Check className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-xs" aria-label="Zamítnout" title="Zamítnout" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => review(c, false)}><X className="size-3.5" /></Button>
                        </>}
                        {canDelete && <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(c)}><Trash2 className="size-3.5" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {showNew && <ExpenseDialog onClose={() => setShowNew(false)} />}
    </div>
  )
}

function ExpenseDialog({ onClose }: { onClose: () => void }) {
  const [pending, start] = useTransition()
  const today = new Date().toISOString().slice(0, 10)
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => { const res = await createExpense(fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Výdaj odeslán ke schválení'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nový výdaj</DialogTitle><DialogDescription>Výdaj k proplacení. Po schválení se zapíše do financí.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="expenseDate" required defaultValue={today} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Částka</Label><Input type="number" step="0.01" min="0" name="amount" required placeholder="0" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Měna</Label>
              <select name="currency" defaultValue="CZK" className={selectClass}><option value="CZK">CZK</option><option value="EUR">EUR</option><option value="USD">USD</option></select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Kategorie</Label><Input name="category" placeholder="např. Cestovné, Materiál" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="description" placeholder="Účel výdaje" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Odesílám…' : 'Odeslat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
