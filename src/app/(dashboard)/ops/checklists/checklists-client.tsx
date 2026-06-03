'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Play, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveChecklist, deleteChecklist, startRun, toggleRunItem, deleteRun } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const textareaClass = 'w-full rounded-lg border border-input bg-background p-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const SOP_CATEGORY: Record<string, string> = { open: 'Otevření', close: 'Zavření', emergency: 'Nouzové', bar: 'Bar', other: 'Ostatní' }

type Template = { id: string; name: string; category: string; items: string[] }
type RunItem = { id: string; label: string; done: boolean }
type Run = { id: string; name: string; run_date: string; items: RunItem[] }

export function ChecklistsClient({ templates, runs }: { templates: Template[]; runs: Run[] }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<{ tpl: Template | null } | null>(null)
  const [isPending, start] = useTransition()

  function run(t: Template) {
    start(async () => { const r = await startRun(t.id); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Checklist spuštěn'); router.refresh() } })
  }
  async function removeTpl(t: Template) {
    const ok = await confirmDialog({ title: `Smazat šablonu „${t.name}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deleteChecklist(t.id); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Smazáno'); router.refresh() } })
  }
  async function removeRun(r: Run) {
    const ok = await confirmDialog({ title: 'Smazat běh checklistu?', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const res = await deleteRun(r.id); if (res?.error) toast.error('Chyba', res.error); else router.refresh() })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Šablony</h3>
          <Button size="sm" onClick={() => setDialog({ tpl: null })}><Plus className="size-4" />Nová šablona</Button>
        </div>
        {templates.length === 0 ? (
          <EmptyState icon={ListChecks} title="Žádné šablony" description="Vytvoř checklist (otevření, zavření, nouzové postupy)." />
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 shrink-0">{SOP_CATEGORY[t.category] ?? t.category}</Badge>
                  <span className="flex-1 truncate text-sm font-medium text-foreground">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.items.length} kroků</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" disabled={isPending} onClick={() => run(t)}><Play className="size-3.5" />Spustit</Button>
                  <Button variant="outline" size="sm" disabled={isPending} onClick={() => setDialog({ tpl: t })}><Pencil className="size-3.5" />Upravit</Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => removeTpl(t)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Runs */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Spuštěné checklisty</h3>
        {runs.length === 0 ? (
          <EmptyState icon={ListChecks} title="Žádné běhy" description="Spusť checklist ze šablony a odškrtávej kroky." />
        ) : (
          <div className="space-y-2">{runs.map((r) => <RunCard key={r.id} run={r} onDelete={() => removeRun(r)} />)}</div>
        )}
      </div>

      {dialog && <TemplateDialog tpl={dialog.tpl} onClose={() => setDialog(null)} onDone={() => router.refresh()} />}
    </div>
  )
}

function RunCard({ run, onDelete }: { run: Run; onDelete: () => void }) {
  const [items, setItems] = useState<RunItem[]>(run.items)
  const [, start] = useTransition()
  const done = items.filter((i) => i.done).length
  function toggle(it: RunItem) {
    const next = !it.done
    setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, done: next } : x)))
    start(async () => { const r = await toggleRunItem(it.id, next); if (r?.error) toast.error('Chyba', r.error) })
  }
  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3">
        <span className="flex-1 truncate text-sm font-medium text-foreground">{run.name}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{done}/{items.length}</span>
        <Badge variant={done === items.length && items.length > 0 ? 'success' : 'secondary'} className="h-5">{run.run_date ? new Date(run.run_date).toLocaleDateString('cs-CZ') : ''}</Badge>
        <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" onClick={(e) => { e.preventDefault(); onDelete() }}><Trash2 className="size-3.5" /></Button>
      </summary>
      <div className="space-y-0.5 border-t border-border p-2">
        {items.map((it) => (
          <label key={it.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
            <input type="checkbox" checked={it.done} onChange={() => toggle(it)} className="size-4 rounded border-input accent-primary" />
            <span className={cn('flex-1', it.done && 'text-muted-foreground line-through')}>{it.label}</span>
          </label>
        ))}
        {items.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">Bez kroků.</p>}
      </div>
    </details>
  )
}

function TemplateDialog({ tpl, onClose, onDone }: { tpl: Template | null; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => { const r = await saveChecklist(fd); if (r?.error) { toast.error('Chyba', r.error); return } toast.success('Uloženo'); onClose(); onDone() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tpl ? 'Upravit šablonu' : 'Nová šablona'}</DialogTitle><DialogDescription>Každý krok na samostatný řádek.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {tpl && <input type="hidden" name="id" value={tpl.id} />}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="name" required defaultValue={tpl?.name ?? ''} placeholder="např. Zavření klubu" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kategorie</Label>
              <select name="category" defaultValue={tpl?.category ?? 'other'} className={selectClass}>{Object.entries(SOP_CATEGORY).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Kroky (každý na řádek)</Label><textarea name="items" rows={8} required defaultValue={tpl?.items?.join('\n') ?? ''} className={textareaClass} placeholder={'Zkontrolovat kasu\nVypnout výčep\nZkontrolovat nouzové východy'} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
