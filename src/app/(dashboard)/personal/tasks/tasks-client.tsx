'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ListTodo, Check, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveTask, toggleTask, deleteTask } from '../actions'

type Task = { id: string; title: string; note: string | null; due_date: string | null; priority: string; done: boolean }
type Assigned = { id: string; title: string; start_time: string }

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const PRIORITY: Record<string, string> = { low: 'Nízká', normal: 'Běžná', high: 'Vysoká' }
const todayStr = () => new Date().toISOString().slice(0, 10)

export function TasksClient({ tasks, assigned = [] }: { tasks: Task[]; assigned?: Assigned[] }) {
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggle(t: Task) {
    startTransition(async () => {
      const res = await toggleTask(t.id, !t.done)
      if (res?.error) toast.error('Chyba', res.error)
    })
  }
  async function remove(t: Task) {
    const ok = await confirmDialog({ title: 'Smazat úkol?', description: 'Úkol bude trvale odstraněn.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteTask(t.id)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Smazáno')
    })
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  const Row = (t: Task) => {
    const overdue = !t.done && t.due_date && t.due_date < todayStr()
    return (
      <div key={t.id} className="group flex items-center gap-3 px-3 py-2.5">
        <button onClick={() => toggle(t)} disabled={isPending} aria-label={t.done ? 'Označit jako nesplněné' : 'Splnit'}
          className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors', t.done ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:border-primary')}>
          {t.done && <Check className="size-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-sm', t.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{t.title}</div>
          {t.note && <div className="truncate text-xs text-muted-foreground">{t.note}</div>}
        </div>
        {t.priority === 'high' && !t.done && <Badge variant="outline" className="shrink-0 border-destructive/40 text-destructive">Vysoká</Badge>}
        {t.due_date && (
          <span className={cn('shrink-0 text-xs tabular-nums', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {new Date(t.due_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}
          </span>
        )}
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => setEditing(t)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" onClick={() => remove(t)}><Trash2 className="size-4" /></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{open.length} k vyřízení · {done.length} hotovo</p>
        <Button size="lg" onClick={() => setCreating(true)}><Plus className="size-4" />Nový úkol</Button>
      </div>

      {assigned.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-amber-400/40 bg-card shadow-xs">
          <div className="flex items-center gap-2 border-b border-border bg-amber-400/10 px-3 py-2 text-xs font-medium text-foreground">
            <CalendarClock className="size-3.5 text-amber-500" />Přiřazené úkoly (sdílený kalendář)
            <Link href="/calendar" className="ml-auto font-normal text-primary hover:underline">Kalendář →</Link>
          </div>
          <div className="divide-y divide-border">
            {assigned.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.title}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{new Date(a.start_time).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {tasks.length === 0 ? (
          <EmptyState icon={ListTodo} title="Žádné úkoly" description="Přidej si soukromý úkol — vidíš ho jen ty." />
        ) : (
          <div className="divide-y divide-border">
            {open.map(Row)}
            {done.length > 0 && <div className="bg-muted/30 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hotové</div>}
            {done.map(Row)}
          </div>
        )}
      </div>

      {(creating || editing) && <TaskDialog task={editing} onClose={() => { setCreating(false); setEditing(null) }} />}
    </div>
  )
}

function TaskDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (task) fd.set('id', task.id)
    startTransition(async () => {
      const res = await saveTask(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(task ? 'Uloženo' : 'Úkol vytvořen')
      onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Upravit úkol' : 'Nový úkol'}</DialogTitle>
          <DialogDescription>Soukromý úkol — vidíš ho jen ty.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required defaultValue={task?.title || ''} placeholder="Co je potřeba udělat?" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka (volitelné)</Label><Input name="note" defaultValue={task?.note || ''} placeholder="Detail" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Termín</Label><Input name="dueDate" type="date" defaultValue={task?.due_date || ''} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priorita</Label>
              <select name="priority" defaultValue={task?.priority || 'normal'} className={selectClass}>
                {Object.entries(PRIORITY).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
