'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Plus, Trash2, MessageSquare, ListTodo, Users, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  sendDepartmentMessage, deleteDepartmentMessage,
  createDepartmentTask, toggleDepartmentTask, deleteDepartmentTask,
} from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const PRIORITY: Record<string, { label: string; variant: 'secondary' | 'info' | 'destructive' }> = {
  low: { label: 'Nízká', variant: 'secondary' },
  normal: { label: 'Běžná', variant: 'info' },
  high: { label: 'Vysoká', variant: 'destructive' },
}

type Dept = { id: string; name: string }
type Emp = { user_id: string; name: string; department_id: string | null; position: string | null }

export function DepartmentsClient({
  departments, employees, messages, tasks, currentUserId, defaultDepartmentId, isManagement,
}: {
  departments: Dept[]
  employees: Emp[]
  messages: any[]
  tasks: any[]
  currentUserId: string
  defaultDepartmentId: string
  isManagement: boolean
}) {
  const router = useRouter()
  const [deptId, setDeptId] = useState(defaultDepartmentId)
  const [tab, setTab] = useState<'chat' | 'tasks'>('chat')
  const [taskDialog, setTaskDialog] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()
  const feedRef = useRef<HTMLDivElement>(null)

  // Lehký polling — chat se obnoví i bez odeslání zprávy.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(t)
  }, [router])

  const dept = departments.find((d) => d.id === deptId) || departments[0]
  const deptMessages = useMemo(
    () => messages.filter((m) => m.department_id === dept.id).slice().reverse(),
    [messages, dept.id],
  )
  const deptTasks = useMemo(() => tasks.filter((t) => t.department_id === dept.id), [tasks, dept.id])
  const openTasks = deptTasks.filter((t) => !t.done)
  const members = useMemo(() => employees.filter((e) => e.department_id === dept.id), [employees, dept.id])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight })
  }, [deptMessages.length, dept.id, tab])

  function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    startTransition(async () => {
      const r = await sendDepartmentMessage(dept.id, text)
      if (r?.error) { toast.error('Chyba', r.error); setDraft(text) }
    })
  }

  async function removeMessage(m: any) {
    const ok = await confirmDialog({ title: 'Smazat zprávu?', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const r = await deleteDepartmentMessage(m.id); if (r?.error) toast.error('Chyba', r.error) })
  }

  async function removeTask(t: any) {
    const ok = await confirmDialog({ title: `Smazat úkol „${t.title}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const r = await deleteDepartmentTask(t.id); if (r?.error) toast.error('Chyba', r.error) })
  }

  const fmtTime = (iso: string) => new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      <PageHeader title="Oddělení" description="Chat a úkoly týmu." />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setDeptId(d.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                d.id === dept.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button onClick={() => setTab('chat')} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', tab === 'chat' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <MessageSquare className="size-3.5" />Chat
          </button>
          <button onClick={() => setTab('tasks')} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', tab === 'tasks' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <ListTodo className="size-3.5" />Úkoly {openTasks.length > 0 && <Badge variant="info">{openTasks.length}</Badge>}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {tab === 'chat' ? (
            <div className="flex h-[62dvh] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {deptMessages.length === 0 ? (
                  <EmptyState icon={MessageSquare} title="Zatím žádné zprávy" description={`Napište první zprávu oddělení ${dept.name}.`} />
                ) : deptMessages.map((m) => {
                  const mine = m.user_id === currentUserId
                  return (
                    <div key={m.id} className={cn('group flex items-start gap-2.5', mine && 'flex-row-reverse')}>
                      <Avatar name={m.author} />
                      <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2', mine ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted text-foreground')}>
                        {!mine && <div className="mb-0.5 text-xs font-semibold">{m.author}</div>}
                        <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{fmtTime(m.created_at)}</div>
                      </div>
                      {(mine || isManagement) && (
                        <button onClick={() => removeMessage(m)} aria-label="Smazat zprávu" className="mt-1 hidden text-muted-foreground transition-colors group-hover:block hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-end gap-2 border-t border-border p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  rows={1}
                  placeholder={`Zpráva pro ${dept.name}… (Enter odešle)`}
                  className="max-h-32 min-h-9 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <Button onClick={send} disabled={pending || !draft.trim()} aria-label="Odeslat"><Send className="size-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button onClick={() => setTaskDialog(true)}><Plus className="size-4" />Nový úkol</Button>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                {deptTasks.length === 0 ? (
                  <EmptyState icon={ListTodo} title="Žádné úkoly" description={`Vytvořte první úkol pro ${dept.name}.`} />
                ) : (
                  <ul className="divide-y divide-border">
                    {deptTasks.map((t) => {
                      const pr = PRIORITY[t.priority] ?? PRIORITY.normal
                      const overdue = !t.done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10)
                      return (
                        <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={t.done}
                            onChange={(e) => startTransition(async () => { const r = await toggleDepartmentTask(t.id, e.target.checked); if (r?.error) toast.error('Chyba', r.error) })}
                            className="mt-1 size-4 accent-[var(--primary)]"
                            aria-label="Hotovo"
                          />
                          <div className="min-w-0 flex-1">
                            <div className={cn('text-sm font-medium', t.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{t.title}</div>
                            {t.description && <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant={pr.variant}>{pr.label}</Badge>
                              {t.due_date && (
                                <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-destructive')}>
                                  <CalendarDays className="size-3" />{new Date(t.due_date).toLocaleDateString('cs-CZ')}
                                </span>
                              )}
                              {t.assignee && <span>→ {t.assignee}</span>}
                              {t.creator && <span className="text-muted-foreground/70">zadal {t.creator}</span>}
                            </div>
                          </div>
                          {(t.created_by === currentUserId || isManagement) && (
                            <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" onClick={() => removeTask(t)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="mb-2 flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Členové ({members.length})</h3></div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nikdo není zařazen.</p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-2.5">
                    <Avatar name={m.name} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{m.name}</div>
                      {m.position && <div className="truncate text-xs text-muted-foreground">{m.position}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {taskDialog && <TaskDialog departmentId={dept.id} deptName={dept.name} members={members} onClose={() => setTaskDialog(false)} />}
    </div>
  )
}

function TaskDialog({ departmentId, deptName, members, onClose }: { departmentId: string; deptName: string; members: Emp[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await createDepartmentTask(departmentId, fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success('Úkol vytvořen'); onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nový úkol — {deptName}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required placeholder="Co je potřeba udělat" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="description" placeholder="Volitelně…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Termín</Label><Input type="date" name="dueDate" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Priorita</Label>
              <select name="priority" defaultValue="normal" className={selectClass}>
                <option value="low">Nízká</option><option value="normal">Běžná</option><option value="high">Vysoká</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Přiřadit</Label>
            <select name="assignedTo" defaultValue="none" className={selectClass}>
              <option value="none">Celé oddělení</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Vytvořit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
