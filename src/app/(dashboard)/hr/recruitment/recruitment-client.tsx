'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Briefcase, Lock, Unlock, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createJob, setJobStatus, deleteJob, createCandidate, setCandidateStage, deleteCandidate } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const STAGES: { id: string; label: string }[] = [
  { id: 'applied', label: 'Přihlášení' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Pohovor' },
  { id: 'offer', label: 'Nabídka' },
  { id: 'hired', label: 'Přijat' },
  { id: 'rejected', label: 'Zamítnut' },
]

type Dept = { id: string; name: string }

export function RecruitmentClient({ jobs, candidates, departments }: { jobs: any[]; candidates: any[]; departments: Dept[] }) {
  const [showJob, setShowJob] = useState(false)
  const [showCand, setShowCand] = useState(false)
  const [isPending, startTransition] = useTransition()

  function moveStage(id: string, stage: string) {
    startTransition(async () => {
      const res = await setCandidateStage(id, stage)
      if (res?.error) toast.error('Chyba', res.error)
    })
  }
  async function removeCandidate(c: any) {
    const ok = await confirmDialog({ title: `Smazat kandidáta „${c.name}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteCandidate(c.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Kandidát smazán') })
  }
  function toggleJob(j: any) {
    startTransition(async () => {
      const res = await setJobStatus(j.id, j.status === 'open' ? 'closed' : 'open')
      if (res?.error) toast.error('Chyba', res.error)
    })
  }
  async function removeJob(j: any) {
    const ok = await confirmDialog({ title: `Smazat pozici „${j.title}"?`, description: 'Smaže i navázané kandidáty.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteJob(j.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Pozice smazána') })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{jobs.length} pozic · {candidates.length} kandidátů</p>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => setShowCand(true)}><UserPlus className="size-4" />Nový kandidát</Button>
          <Button size="lg" onClick={() => setShowJob(true)}><Plus className="size-4" />Nová pozice</Button>
        </div>
      </div>

      {/* Job postings */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Otevřené pozice</h2>
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-xs">
            <EmptyState icon={Briefcase} title="Žádné pozice" description="Vytvořte první pracovní pozici." />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.map((j) => (
              <div key={j.id} className="group rounded-xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-foreground">{j.title}</div>
                    <div className="text-xs text-muted-foreground">{j.dept_name || 'Bez oddělení'} · {j.candidate_count} kandidátů</div>
                  </div>
                  <Badge variant={j.status === 'open' ? 'success' : 'secondary'}>{j.status === 'open' ? 'Otevřená' : 'Uzavřená'}</Badge>
                </div>
                {j.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>}
                <div className="mt-3 flex gap-1 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => toggleJob(j)}>
                    {j.status === 'open' ? <><Lock className="size-3.5" />Uzavřít</> : <><Unlock className="size-3.5" />Otevřít</>}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Smazat pozici" className="ml-auto text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => removeJob(j)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Candidate pipeline */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Pipeline kandidátů</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const list = candidates.filter((c) => c.stage === stage.id)
            return (
              <div key={stage.id} className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-2">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{list.length}</Badge>
                </div>
                <div className="space-y-2">
                  {list.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border bg-card p-2.5 shadow-xs">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
                          {c.job_title && <div className="truncate text-xs text-muted-foreground">{c.job_title}</div>}
                        </div>
                        <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => removeCandidate(c)}><Trash2 className="size-3.5" /></Button>
                      </div>
                      {(c.email || c.phone) && <div className="mt-1 truncate text-[11px] text-muted-foreground">{c.email || c.phone}</div>}
                      <select className={cn(selectClass, 'mt-2 h-7 text-xs')} value={c.stage} disabled={isPending} onChange={(e) => moveStage(c.id, e.target.value)}>
                        {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  ))}
                  {list.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {showJob && <JobDialog departments={departments} onClose={() => setShowJob(false)} />}
      {showCand && <CandidateDialog jobs={jobs} onClose={() => setShowCand(false)} />}
    </div>
  )
}

function JobDialog({ departments, onClose }: { departments: Dept[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createJob(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success('Pozice vytvořena'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nová pozice</DialogTitle><DialogDescription>Vytvořte pracovní pozici pro nábor.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název pozice</Label><Input name="title" required placeholder="např. Frontend vývojář" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Oddělení</Label>
            <select name="departmentId" defaultValue="none" className={selectClass}>
              <option value="none">—</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis (volitelné)</Label><Input name="description" placeholder="Krátký popis role…" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Vytvořit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CandidateDialog({ jobs, onClose }: { jobs: any[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createCandidate(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success('Kandidát přidán'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nový kandidát</DialogTitle><DialogDescription>Přidejte kandidáta do pipeline.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Jméno</Label><Input name="name" required placeholder="Jan Novák" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pozice</Label>
            <select name="jobId" defaultValue="none" className={selectClass}>
              <option value="none">— bez pozice —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">E-mail</Label><Input type="email" name="email" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Telefon</Label><Input name="phone" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="notes" placeholder="Krátká poznámka…" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
