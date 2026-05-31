'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Target, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveMilestone, setMilestoneProgress, deleteMilestone } from '@/app/(dashboard)/milestones/actions'
import { savePersonalGoal, setPersonalGoalProgress, deletePersonalGoal } from '@/app/(dashboard)/personal/actions'

export type Goal = { id: string; title: string; description: string | null; timeframe: string; target_date: string | null; progress: number }

const TIMEFRAMES = [
  { key: 'week', label: 'Týden', hint: 'Cíle na tento týden' },
  { key: 'month', label: 'Měsíc', hint: 'Cíle na tento měsíc' },
  { key: 'year', label: 'Rok', hint: 'Roční cíle' },
]
const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function GoalsBoard({ goals, canManage, kind }: { goals: Goal[]; canManage: boolean; kind: 'company' | 'personal' }) {
  const A = kind === 'company'
    ? { save: saveMilestone, setProgress: setMilestoneProgress, remove: deleteMilestone }
    : { save: savePersonalGoal, setProgress: setPersonalGoalProgress, remove: deletePersonalGoal }
  const [dialog, setDialog] = useState<{ goal?: Goal; timeframe?: string } | null>(null)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TIMEFRAMES.map((tf) => {
        const items = goals.filter((g) => g.timeframe === tf.key)
        const avg = items.length ? Math.round(items.reduce((s, g) => s + g.progress, 0) / items.length) : 0
        return (
          <section key={tf.key} className="flex flex-col rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{tf.label}</h3>
                <p className="text-[11px] text-muted-foreground">{items.length ? `${items.length} cílů · průměr ${avg} %` : tf.hint}</p>
              </div>
              {canManage && (
                <Button variant="ghost" size="icon-sm" aria-label={`Přidat cíl: ${tf.label}`} onClick={() => setDialog({ timeframe: tf.key })}><Plus className="size-4" /></Button>
              )}
            </div>
            <div className="flex-1 space-y-2 p-3">
              {items.length === 0 ? (
                <button disabled={!canManage} onClick={() => setDialog({ timeframe: tf.key })}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-xs text-muted-foreground transition-colors enabled:hover:border-primary/40 enabled:hover:text-foreground disabled:opacity-60">
                  <Target className="size-4" />{canManage ? 'Přidat cíl' : 'Žádné cíle'}
                </button>
              ) : items.map((g) => (
                <GoalCard key={g.id} goal={g} canManage={canManage} A={A} onEdit={() => setDialog({ goal: g })} />
              ))}
            </div>
          </section>
        )
      })}

      {dialog && <GoalDialog goal={dialog.goal} timeframe={dialog.timeframe} save={A.save} onClose={() => setDialog(null)} />}
    </div>
  )
}

function GoalCard({ goal, canManage, A, onEdit }: { goal: Goal; canManage: boolean; A: any; onEdit: () => void }) {
  const [pct, setPct] = useState(goal.progress)
  const [, start] = useTransition()
  useEffect(() => { setPct(goal.progress) }, [goal.progress])

  function commit(v: number) {
    if (v === goal.progress) return
    start(async () => { const r = await A.setProgress(goal.id, v); if (r?.error) toast.error('Chyba', r.error) })
  }
  async function remove() {
    const ok = await confirmDialog({ title: `Smazat cíl „${goal.title}"?`, description: 'Cíl bude trvale odstraněn.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await A.remove(goal.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
  }

  const done = pct >= 100
  return (
    <div className="group rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {done && <Check className="size-3.5 shrink-0 text-success" />}
            <h4 className={cn('truncate text-sm font-medium', done ? 'text-muted-foreground' : 'text-foreground')}>{goal.title}</h4>
          </div>
          {goal.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{goal.description}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={onEdit} aria-label="Upravit" className="rounded p-1 text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></button>
            <button onClick={remove} aria-label="Smazat" className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full transition-all', done ? 'bg-success' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{pct} %</span>
      </div>

      {canManage && (
        <input type="range" min={0} max={100} step={5} value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value))}
          onKeyUp={() => commit(pct)} onBlur={() => commit(pct)}
          className="mt-2 w-full accent-primary" aria-label="Pokrok" />
      )}

      {goal.target_date && (
        <div className="mt-2"><Badge variant="outline" className="text-[11px]">do {new Date(goal.target_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}</Badge></div>
      )}
    </div>
  )
}

function GoalDialog({ goal, timeframe, save, onClose }: { goal?: Goal; timeframe?: string; save: (fd: FormData) => Promise<{ error?: string }>; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState(goal?.progress ?? 0)
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (goal) fd.set('id', goal.id)
    fd.set('progress', String(progress))
    startTransition(async () => {
      const res = await save(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(goal ? 'Uloženo' : 'Cíl vytvořen')
      onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? 'Upravit cíl' : 'Nový cíl'}</DialogTitle>
          <DialogDescription>Cíl s obdobím a postupem.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required defaultValue={goal?.title || ''} placeholder="Čeho chceš dosáhnout?" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis (volitelné)</Label><Input name="description" defaultValue={goal?.description || ''} placeholder="Detail / metrika úspěchu" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Období</Label>
              <select name="timeframe" defaultValue={goal?.timeframe || timeframe || 'month'} className={selectClass}>
                {TIMEFRAMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Termín (volitelné)</Label><Input name="targetDate" type="date" defaultValue={goal?.target_date || ''} /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pokrok: {progress} %</Label>
            <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-primary" />
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
