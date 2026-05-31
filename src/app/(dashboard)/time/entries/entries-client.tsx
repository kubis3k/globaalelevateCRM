'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { createTimeEntry, deleteTimeEntry } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const hrs = (m: number) => `${(m / 60).toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} h`

type Project = { id: string; name: string }

export function TimeEntriesClient({ entries, projects, currentUserId, canManageAll }: { entries: any[]; projects: Project[]; currentUserId: string; canManageAll: boolean }) {
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => (filter === 'none' ? !e.project_id : e.project_id === filter))),
    [entries, filter],
  )
  const totalMin = filtered.reduce((a, e) => a + e.minutes, 0)
  const billableMin = filtered.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0)

  async function remove(e: any) {
    const ok = await confirmDialog({ title: 'Smazat záznam?', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteTimeEntry(e.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Záznam smazán') })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectClass} style={{ width: 'auto' }}>
            <option value="all">Všechny projekty</option>
            <option value="none">Bez projektu</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <p className="text-sm text-muted-foreground">
            {filtered.length} záznamů · <span className="font-semibold tabular-nums text-foreground">{hrs(totalMin)}</span> · fakturovatelné <span className="font-semibold tabular-nums text-foreground">{hrs(billableMin)}</span>
          </p>
        </div>
        <Button size="lg" onClick={() => setShowNew(true)}><Plus className="size-4" />Nový záznam</Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} title="Žádné výkazy" description="Vykaž první odpracované hodiny na projektu." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Osoba</TableHead>
                <TableHead>Popis</TableHead>
                <TableHead>Fakt.</TableHead>
                <TableHead className="text-right">Hodiny</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const editable = canManageAll || e.user_id === currentUserId
                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{new Date(e.work_date).toLocaleDateString('cs-CZ')}</TableCell>
                    <TableCell className="font-medium text-foreground">{e.project_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{e.person_name || '—'}</TableCell>
                    <TableCell className="max-w-[20rem] truncate text-muted-foreground">{e.description || '—'}</TableCell>
                    <TableCell>{e.billable ? <Badge variant="success">Ano</Badge> : <Badge variant="secondary">Ne</Badge>}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">{hrs(e.minutes)}</TableCell>
                    <TableCell>
                      {editable && <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(e)}><Trash2 className="size-3.5" /></Button>}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {showNew && <EntryDialog projects={projects} onClose={() => setShowNew(false)} />}
    </div>
  )
}

function EntryDialog({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await createTimeEntry(fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Záznam přidán'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nový výkaz práce</DialogTitle><DialogDescription>Vykaž odpracované hodiny.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Projekt</Label>
            <select name="projectId" defaultValue="none" className={selectClass}>
              <option value="none">— bez projektu —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="workDate" required defaultValue={today} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Hodiny</Label><Input type="number" step="0.25" min="0" name="hours" required placeholder="např. 1.5" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Sazba / h</Label><Input type="number" step="0.01" min="0" name="hourlyRate" placeholder="volitelné" /></div>
            <div className="flex items-end pb-1.5">
              <label className="inline-flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="billable" defaultChecked className="size-4 rounded border-input accent-primary" />
                Fakturovatelné
              </label>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="description" placeholder="Co bylo odpracováno" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
