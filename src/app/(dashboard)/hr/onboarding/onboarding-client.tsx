'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, ListChecks, UserPlus, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveChecklistTemplate, deleteChecklist, assignChecklist, toggleRunItem, deleteRun } from '../actions'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
type Person = { user_id: string; name: string }
type Template = any
type Run = any

export function HrOnboardingClient({ templates, runs, people, canManage }: {
  templates: Template[]; runs: Run[]; people: Person[]; canManage: boolean
}) {
  const [tplDialog, setTplDialog] = useState<{ open: boolean; tpl: Template | null }>({ open: false, tpl: null })
  const [pending, startTransition] = useTransition()
  const [assignUser, setAssignUser] = useState('')
  const [assignTpl, setAssignTpl] = useState('')

  function assign() {
    if (!assignUser || !assignTpl) { toast.error('Vyber zaměstnance i šablonu'); return }
    const fd = new FormData(); fd.set('userId', assignUser); fd.set('checklistId', assignTpl)
    startTransition(async () => { const r = await assignChecklist(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Checklist přiřazen'); setAssignUser(''); setAssignTpl('') } })
  }
  function toggle(itemId: string, done: boolean) {
    startTransition(async () => { const r = await toggleRunItem(itemId, done); if (r?.error) toast.error('Chyba', r.error) })
  }
  function removeRun(run: Run) {
    confirmDialog({ title: 'Smazat průběh?', description: `${run.name} — ${run.employee}.`, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const r = await deleteRun(run.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
    })
  }
  function removeTpl(tpl: Template) {
    confirmDialog({ title: `Smazat šablonu „${tpl.name}"?`, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const r = await deleteChecklist(tpl.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
    })
  }

  return (
    <div className="space-y-6">
      {/* Probíhající */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Probíhající</h3>
        {runs.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nic neprobíhá" description={canManage ? 'Přiřaď zaměstnanci onboarding/offboarding checklist níže.' : 'Zatím ti nebyl přiřazen žádný checklist.'} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {runs.map((run) => {
              const total = run.items.length, done = run.items.filter((i: any) => i.done).length
              const pct = total ? Math.round((done / total) * 100) : 0
              return (
                <div key={run.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        {run.kind === 'offboarding' ? <LogOut className="size-4 text-muted-foreground" /> : <LogIn className="size-4 text-muted-foreground" />}
                        {run.employee}
                      </div>
                      <div className="text-xs text-muted-foreground">{run.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={done === total ? 'success' : 'info'}>{done}/{total}</Badge>
                      {canManage && <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeRun(run)}><Trash2 className="size-3.5" /></Button>}
                    </div>
                  </div>
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                  <ul className="space-y-1">
                    {run.items.map((it: any) => (
                      <li key={it.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={it.done} disabled={!canManage || pending} onChange={(e) => toggle(it.id, e.target.checked)} className="size-4 accent-primary" />
                        <span className={cn(it.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{it.label}</span>
                      </li>
                    ))}
                    {run.items.length === 0 && <li className="text-xs text-muted-foreground">Šablona neměla položky.</li>}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {canManage && (
        <>
          {/* Přiřadit */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><UserPlus className="size-4" />Přiřadit checklist</h3>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1"><Label className="text-xs text-muted-foreground">Zaměstnanec</Label>
                <select value={assignUser} onChange={(e) => setAssignUser(e.target.value)} className={selectClass}><option value="">—</option>{people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
              </div>
              <div className="min-w-40 flex-1"><Label className="text-xs text-muted-foreground">Šablona</Label>
                <select value={assignTpl} onChange={(e) => setAssignTpl(e.target.value)} className={selectClass}><option value="">—</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind === 'offboarding' ? 'offboarding' : 'onboarding'})</option>)}</select>
              </div>
              <Button onClick={assign} disabled={pending}>Přiřadit</Button>
            </div>
          </div>

          {/* Šablony */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Šablony</h3>
              <Button size="sm" variant="outline" onClick={() => setTplDialog({ open: true, tpl: null })}><Plus className="size-4" />Nová šablona</Button>
            </div>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatím žádné šablony. Vytvoř např. „Nástup baristy" nebo „Výstup zaměstnance".</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.kind === 'offboarding' ? 'Offboarding' : 'Onboarding'} · {t.items.length} položek</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setTplDialog({ open: true, tpl: t })}><Edit2 className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeTpl(t)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tplDialog.open && canManage && <TemplateDialog tpl={tplDialog.tpl} onClose={() => setTplDialog({ open: false, tpl: null })} />}
    </div>
  )
}

function TemplateDialog({ tpl, onClose }: { tpl: Template | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!tpl
  const [name, setName] = useState(tpl?.name || '')
  const [kind, setKind] = useState(tpl?.kind || 'onboarding')
  const [text, setText] = useState((tpl?.items || []).map((i: any) => i.label).join('\n'))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Zadej název šablony'); return }
    const fd = new FormData()
    if (isEdit) fd.set('id', tpl.id)
    fd.set('name', name.trim()); fd.set('kind', kind)
    for (const line of text.split('\n').map((s) => s.trim()).filter(Boolean)) fd.append('items', line)
    startTransition(async () => { const r = await saveChecklistTemplate(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Šablona uložena'); onClose() } })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit šablonu' : 'Nová šablona'}</DialogTitle>
          <DialogDescription>Položky zadej po řádcích — každý řádek = jeden úkol.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nástup baristy" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Typ</Label>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={selectClass}><option value="onboarding">Onboarding</option><option value="offboarding">Offboarding</option></select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Položky (řádek = úkol)</Label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={'Podepsat smlouvu\nPředat klíče / čip\nProškolení BOZP\nZřídit e-mail a přístupy\nZadat do mzdové evidence'} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
