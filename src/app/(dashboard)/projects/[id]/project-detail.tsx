'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, Pencil, FolderKanban, Building2, User, CalendarDays, Wallet, Flag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { updateProject, deleteProject, createTask, setTaskStatus, deleteTask } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)

const PROJECT_STATUS: Record<string, { label: string; variant: 'secondary' | 'info' | 'warning' | 'success' | 'destructive' }> = {
  planning: { label: 'Plánování', variant: 'secondary' },
  active: { label: 'Aktivní', variant: 'info' },
  on_hold: { label: 'Pozastaveno', variant: 'warning' },
  completed: { label: 'Dokončeno', variant: 'success' },
  cancelled: { label: 'Zrušeno', variant: 'destructive' },
}
const PRIORITY: Record<string, { label: string; variant: 'secondary' | 'info' | 'destructive' }> = {
  low: { label: 'Nízká', variant: 'secondary' },
  medium: { label: 'Střední', variant: 'info' },
  high: { label: 'Vysoká', variant: 'destructive' },
}
const TASK_STATUSES: { id: string; label: string }[] = [
  { id: 'todo', label: 'K vyřízení' },
  { id: 'in_progress', label: 'Probíhá' },
  { id: 'done', label: 'Hotovo' },
]

type Client = { id: string; name: string }
type Person = { user_id: string; name: string }

export function ProjectDetail({ project, tasks, clients, people }: { project: any; tasks: any[]; clients: Client[]; people: Person[] }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showTask, setShowTask] = useState(false)
  const [isPending, startTransition] = useTransition()
  const st = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.planning
  const pr = PRIORITY[project.priority] ?? PRIORITY.medium

  const done = tasks.filter((t) => t.status === 'done').length
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  function moveTask(id: string, status: string) {
    startTransition(async () => { const res = await setTaskStatus(id, project.id, status); if (res?.error) toast.error('Chyba', res.error) })
  }
  async function removeTask(t: any) {
    const ok = await confirmDialog({ title: 'Smazat úkol?', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteTask(t.id, project.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Úkol smazán') })
  }
  async function removeProject() {
    const ok = await confirmDialog({ title: `Smazat projekt „${project.name}"?`, description: 'Smažou se i všechny úkoly v projektu.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteProject(project.id); if (res?.error) toast.error('Chyba', res.error) })
  }

  return (
    <div className="space-y-6">
      <Link href="/projects/board" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Zpět na nástěnku</Link>

      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-xs">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: '#7c3aed' }}><FolderKanban className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{project.name}</h2>
            <Badge variant={st.variant}>{st.label}</Badge>
            <Badge variant={pr.variant} className="gap-1"><Flag className="size-3" />{pr.label}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {project.client_name && <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" />{project.client_name}</span>}
            {project.owner_name && <span className="inline-flex items-center gap-1"><User className="size-3.5" />{project.owner_name}</span>}
            {project.due_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />do {new Date(project.due_date).toLocaleDateString('cs-CZ')}</span>}
            {project.budget != null && <span className="inline-flex items-center gap-1"><Wallet className="size-3.5" />{czk(Number(project.budget), project.currency)}</span>}
          </div>
          {project.description && <p className="mt-3 text-sm text-foreground/90">{project.description}</p>}
          {/* Progress */}
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Průběh úkolů</span><span className="tabular-nums">{done}/{tasks.length} · {pct}&nbsp;%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="size-3.5" />Upravit</Button>
          <Button variant="ghost" size="icon-sm" aria-label="Smazat projekt" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={removeProject}><Trash2 className="size-4" /></Button>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Úkoly</h3>
        <Button size="lg" onClick={() => setShowTask(true)}><Plus className="size-4" />Přidat úkol</Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Zatím žádné úkoly" description="Přidej první úkol a sleduj jeho průběh." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {TASK_STATUSES.map((col) => {
            const list = tasks.filter((t) => t.status === col.id)
            return (
              <div key={col.id} className="flex flex-col rounded-xl border border-border bg-muted/30 p-2">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <span className="text-xs font-semibold text-foreground">{col.label}</span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{list.length}</Badge>
                </div>
                <div className="space-y-2">
                  {list.map((t) => {
                    const tp = PRIORITY[t.priority] ?? PRIORITY.medium
                    return (
                      <div key={t.id} className="rounded-lg border border-border bg-card p-2.5 shadow-xs">
                        <div className="flex items-start justify-between gap-1">
                          <div className={cn('min-w-0 text-sm font-medium text-foreground', t.status === 'done' && 'text-muted-foreground line-through')}>{t.title}</div>
                          <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => removeTask(t)}><Trash2 className="size-3.5" /></Button>
                        </div>
                        {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant={tp.variant} className="h-4 px-1.5 text-[10px]">{tp.label}</Badge>
                          {t.assignee_name && <span className="text-[11px] text-muted-foreground">{t.assignee_name}</span>}
                          {t.due_date && <span className="text-[11px] text-muted-foreground">do {new Date(t.due_date).toLocaleDateString('cs-CZ')}</span>}
                        </div>
                        <select className={cn(selectClass, 'mt-2 h-7 text-xs')} value={t.status} disabled={isPending} onChange={(e) => moveTask(t.id, e.target.value)}>
                          {TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
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
      )}

      {showEdit && <EditProjectDialog project={project} clients={clients} people={people} onClose={() => setShowEdit(false)} />}
      {showTask && <TaskDialog projectId={project.id} people={people} onClose={() => setShowTask(false)} />}
    </div>
  )
}

function EditProjectDialog({ project, clients, people, onClose }: { project: any; clients: Client[]; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await updateProject(project.id, fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Projekt upraven'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upravit projekt</DialogTitle><DialogDescription>Změň detaily zakázky.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="name" required defaultValue={project.name} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Klient</Label>
            <select name="clientId" defaultValue={project.client_id ?? 'none'} className={selectClass}>
              <option value="none">— bez klienta —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue={project.status} className={selectClass}>{Object.entries(PROJECT_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priorita</Label>
              <select name="priority" defaultValue={project.priority} className={selectClass}>{Object.entries(PRIORITY).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Vlastník</Label>
              <select name="ownerId" defaultValue={project.owner_id ?? 'none'} className={selectClass}><option value="none">—</option>{people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Rozpočet</Label><Input type="number" step="0.01" name="budget" defaultValue={project.budget ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Začátek</Label><Input type="date" name="startDate" defaultValue={project.start_date ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Termín</Label><Input type="date" name="dueDate" defaultValue={project.due_date ?? ''} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="description" defaultValue={project.description ?? ''} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskDialog({ projectId, people, onClose }: { projectId: string; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await createTask(projectId, fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Úkol přidán'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nový úkol</DialogTitle><DialogDescription>Úkol v rámci projektu.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required placeholder="např. Připravit grafický návrh" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue="todo" className={selectClass}>{TASK_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priorita</Label>
              <select name="priority" defaultValue="medium" className={selectClass}>{Object.entries(PRIORITY).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Řešitel</Label>
              <select name="assigneeId" defaultValue="none" className={selectClass}><option value="none">—</option>{people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Termín</Label><Input type="date" name="dueDate" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="description" placeholder="Volitelný popis úkolu" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
