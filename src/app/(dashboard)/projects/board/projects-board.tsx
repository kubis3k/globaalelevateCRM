'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createProject, setProjectStatus, deleteProject } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const STATUSES: { id: string; label: string }[] = [
  { id: 'planning', label: 'Plánování' },
  { id: 'active', label: 'Aktivní' },
  { id: 'on_hold', label: 'Pozastaveno' },
  { id: 'completed', label: 'Dokončeno' },
  { id: 'cancelled', label: 'Zrušeno' },
]
const PRIORITY: Record<string, { label: string; variant: 'secondary' | 'info' | 'destructive' }> = {
  low: { label: 'Nízká', variant: 'secondary' },
  medium: { label: 'Střední', variant: 'info' },
  high: { label: 'Vysoká', variant: 'destructive' },
}
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const ACTIVE = ['planning', 'active', 'on_hold']

type Client = { id: string; name: string }
type Person = { user_id: string; name: string }

export function ProjectsBoard({ projects, clients, people }: { projects: any[]; clients: Client[]; people: Person[] }) {
  const [showNew, setShowNew] = useState(false)
  const [isPending, startTransition] = useTransition()

  function move(id: string, status: string) {
    startTransition(async () => { const res = await setProjectStatus(id, status); if (res?.error) toast.error('Chyba', res.error) })
  }
  async function remove(p: any) {
    const ok = await confirmDialog({ title: `Smazat projekt „${p.name}"?`, description: 'Smažou se i všechny úkoly v projektu.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteProject(p.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Projekt smazán') })
  }

  const activeValue = projects.filter((p) => ACTIVE.includes(p.status)).reduce((a, p) => a + Number(p.budget || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{projects.length} projektů · hodnota aktivních <span className="font-semibold tabular-nums text-foreground">{czk(activeValue)}</span></p>
        <Button size="lg" onClick={() => setShowNew(true)}><Plus className="size-4" />Nový projekt</Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUSES.map((stage) => {
          const list = projects.filter((p) => p.status === stage.id)
          return (
            <div key={stage.id} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-2">
              <div className="flex items-center justify-between px-1 py-1.5">
                <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{list.length}</Badge>
              </div>
              <div className="space-y-2">
                {list.map((p) => {
                  const pr = PRIORITY[p.priority] ?? PRIORITY.medium
                  const pct = p.tasks_total ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0
                  return (
                    <div key={p.id} className="rounded-lg border border-border bg-card p-2.5 shadow-xs">
                      <div className="flex items-start justify-between gap-1">
                        <Link href={`/projects/${p.id}`} className="min-w-0 hover:underline">
                          <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                          {p.client_name && <div className="truncate text-xs text-muted-foreground">{p.client_name}</div>}
                        </Link>
                        <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(p)}><Trash2 className="size-3.5" /></Button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant={pr.variant} className="h-4 px-1.5 text-[10px]">{pr.label}</Badge>
                        {p.due_date && <span className="text-[11px] text-muted-foreground">do {new Date(p.due_date).toLocaleDateString('cs-CZ')}</span>}
                      </div>
                      {p.tasks_total > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Úkoly</span><span className="tabular-nums">{p.tasks_done}/{p.tasks_total}</span></div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                        </div>
                      )}
                      {p.budget != null && <div className="mt-2 text-sm font-semibold tabular-nums text-foreground">{czk(Number(p.budget), p.currency)}</div>}
                      {p.owner_name && <div className="text-[11px] text-muted-foreground">{p.owner_name}</div>}
                      <select className={cn(selectClass, 'mt-2 h-7 text-xs')} value={p.status} disabled={isPending} onChange={(e) => move(p.id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  )
                })}
                {list.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>}
              </div>
            </div>
          )
        })}
      </div>

      {showNew && <ProjectDialog clients={clients} people={people} onClose={() => setShowNew(false)} />}
    </div>
  )
}

function ProjectDialog({ clients, people, onClose }: { clients: Client[]; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await createProject(fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Projekt vytvořen'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nový projekt</DialogTitle><DialogDescription>Zakázka nebo interní projekt.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="name" required placeholder="např. Redesign webu ABC s.r.o." /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Klient</Label>
            <select name="clientId" defaultValue="none" className={selectClass}>
              <option value="none">— bez klienta —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue="planning" className={selectClass}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priorita</Label>
              <select name="priority" defaultValue="medium" className={selectClass}>{Object.entries(PRIORITY).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Vlastník</Label>
              <select name="ownerId" defaultValue="none" className={selectClass}><option value="none">—</option>{people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Rozpočet</Label><Input type="number" step="0.01" name="budget" placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Začátek</Label><Input type="date" name="startDate" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Termín</Label><Input type="date" name="dueDate" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="description" placeholder="Krátký popis zakázky" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Vytvořit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
