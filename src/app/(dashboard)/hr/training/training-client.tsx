'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { saveTraining, deleteTraining } from '../actions'

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'
function daysUntil(d: string | null): number | null { return d ? Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000) : null }
type Person = { user_id: string; name: string }

export function HrTrainingClient({ trainings, people, canManage }: { trainings: any[]; people: Person[]; canManage: boolean }) {
  const [dialog, setDialog] = useState<{ open: boolean; t: any | null }>({ open: false, t: null })
  const [pending, startTransition] = useTransition()

  function remove(t: any) {
    confirmDialog({ title: 'Smazat školení?', description: `${t.name} — ${t.employee}.`, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const r = await deleteTraining(t.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{trainings.length} záznamů · certifikace s expirací hlídáme</p>
        {canManage && <Button size="lg" onClick={() => setDialog({ open: true, t: null })}><Plus className="size-4" />Přidat školení</Button>}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {trainings.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Žádná školení" description={canManage ? 'Eviduj certifikace (barman, security, první pomoc…) vč. expirace.' : 'Zatím nemáš evidovaná školení.'} />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Zaměstnanec</TableHead><TableHead>Školení</TableHead><TableHead>Absolvováno</TableHead><TableHead>Platí do</TableHead>{canManage && <TableHead className="w-16" />}</TableRow></TableHeader>
            <TableBody>
              {trainings.map((t) => {
                const d = daysUntil(t.expires_on)
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-foreground">{t.employee}</TableCell>
                    <TableCell>{t.name}{t.provider && <span className="text-xs text-muted-foreground"> · {t.provider}</span>}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{fmt(t.completed_on)}</TableCell>
                    <TableCell className="tabular-nums">
                      {t.expires_on ? <span className={d != null && d < 0 ? 'text-destructive' : d != null && d <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>{fmt(t.expires_on)}{d != null && d < 0 ? ' (propadlé)' : d != null && d <= 30 ? ` (${d} d)` : ''}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {canManage && <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => setDialog({ open: true, t })}><Edit2 className="size-3.5" /></Button><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => remove(t)}><Trash2 className="size-3.5" /></Button></div></TableCell>}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {dialog.open && canManage && <TrainingDialog t={dialog.t} people={people} onClose={() => setDialog({ open: false, t: null })} />}
    </div>
  )
}

function TrainingDialog({ t, people, onClose }: { t: any | null; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!t
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const r = await saveTraining(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Uloženo'); onClose() } })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? 'Upravit školení' : 'Nové školení / certifikace'}</DialogTitle><DialogDescription>Datum expirace pohlídáme na Přehledu i upozorněním.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={t.id} />}
          {!isEdit && (
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Zaměstnanec</Label>
              <select name="userId" required defaultValue="" className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"><option value="" disabled>— vyber —</option>{people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="name" defaultValue={t?.name || ''} placeholder="Školení BOZP / barmanský kurz…" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Poskytovatel</Label><Input name="provider" defaultValue={t?.provider || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Absolvováno</Label><Input type="date" name="completedOn" defaultValue={t?.completed_on || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Platí do</Label><Input type="date" name="expiresOn" defaultValue={t?.expires_on || ''} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" defaultValue={t?.note || ''} /></div>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
