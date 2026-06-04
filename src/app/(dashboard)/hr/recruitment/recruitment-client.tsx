'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Briefcase, Lock, Unlock, UserPlus, Globe, Download, Edit2, Mail, Phone, CalendarClock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createJob, updateJob, setJobStatus, setJobPublished, deleteJob, createCandidate, setCandidateStage, deleteCandidate, applicantCvUrl } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const taClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const STAGES: { id: string; label: string }[] = [
  { id: 'applied', label: 'Přihlášení' },
  { id: 'screening', label: 'Screening' },
  { id: 'interview', label: 'Pohovor' },
  { id: 'offer', label: 'Nabídka' },
  { id: 'hired', label: 'Přijat' },
  { id: 'rejected', label: 'Zamítnut' },
]
const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.label || id
const EMPLOYMENT: Record<string, string> = { full_time: 'Plný úvazek', part_time: 'Částečný úvazek', brigada: 'Brigáda', dohoda: 'Dohoda (DPP/DPČ)', other: 'Jiné' }
const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

type Dept = { id: string; name: string }

export function RecruitmentClient({ jobs, candidates, departments }: { jobs: any[]; candidates: any[]; departments: Dept[] }) {
  const [jobDialog, setJobDialog] = useState<{ open: boolean; job: any | null }>({ open: false, job: null })
  const [showCand, setShowCand] = useState(false)
  const [detail, setDetail] = useState<any | null>(null)
  const [isPending, startTransition] = useTransition()

  function moveStage(id: string, stage: string) {
    startTransition(async () => {
      const res = await setCandidateStage(id, stage)
      if (res?.error) toast.error('Chyba', res.error)
      else setDetail((d: any) => (d && d.id === id ? { ...d, stage } : d))
    })
  }
  async function removeCandidate(c: any) {
    const ok = await confirmDialog({ title: `Smazat kandidáta „${c.name}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteCandidate(c.id); if (res?.error) toast.error('Chyba', res.error); else { toast.success('Kandidát smazán'); setDetail(null) } })
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
  function togglePublished(j: any) {
    startTransition(async () => { const res = await setJobPublished(j.id, !j.published); if (res?.error) toast.error('Chyba', res.error); else toast.success(j.published ? 'Skryto z webu' : 'Publikováno na kariérní web') })
  }
  function downloadCv(id: string) {
    startTransition(async () => { const res = await applicantCvUrl(id); if (res?.error || !res.url) toast.error('Chyba', res?.error || 'CV není dostupné.'); else window.open(res.url, '_blank', 'noopener,noreferrer') })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{jobs.length} pozic · {candidates.length} kandidátů</p>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => setShowCand(true)}><UserPlus className="size-4" />Nový kandidát</Button>
          <Button size="lg" onClick={() => setJobDialog({ open: true, job: null })}><Plus className="size-4" />Nová pozice</Button>
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
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={j.status === 'open' ? 'success' : 'secondary'}>{j.status === 'open' ? 'Otevřená' : 'Uzavřená'}</Badge>
                    {j.published && <Badge variant="info" className="h-4 px-1.5 text-[10px]">na webu</Badge>}
                  </div>
                </div>
                {(j.employment_type || j.location || j.salary_range) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {j.employment_type && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{EMPLOYMENT[j.employment_type] ?? j.employment_type}</Badge>}
                    {j.location && <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{j.location}</Badge>}
                    {j.salary_range && <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{j.salary_range}</Badge>}
                  </div>
                )}
                {j.description && <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{j.description}</p>}
                <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setJobDialog({ open: true, job: j })}><Edit2 className="size-3.5" />Upravit</Button>
                  <Button variant="ghost" size="sm" disabled={isPending} onClick={() => toggleJob(j)}>
                    {j.status === 'open' ? <><Lock className="size-3.5" />Uzavřít</> : <><Unlock className="size-3.5" />Otevřít</>}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Zveřejnit na webu" title="Zveřejnit na kariérní stránce" disabled={isPending} onClick={() => togglePublished(j)}>
                    <Globe className={cn('size-4', j.published && 'text-success')} />
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
                    <div key={c.id} role="button" tabIndex={0} onClick={() => setDetail(c)} onKeyDown={(e) => { if (e.key === 'Enter') setDetail(c) }}
                      className="cursor-pointer rounded-lg border border-border bg-card p-2.5 shadow-xs transition-colors hover:border-primary/40">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
                          {c.job_title && <div className="truncate text-xs text-muted-foreground">{c.job_title}</div>}
                        </div>
                        <button type="button" aria-label="Smazat" className="rounded p-0.5 text-muted-foreground hover:text-destructive" disabled={isPending} onClick={(e) => { e.stopPropagation(); removeCandidate(c) }}><Trash2 className="size-3.5" /></button>
                      </div>
                      {(c.email || c.phone) && <div className="mt-1 truncate text-[11px] text-muted-foreground">{c.email || c.phone}</div>}
                      {(c.source === 'web' || c.cv_path) && (
                        <div className="mt-1.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {c.source === 'web' && <Badge variant="info" className="h-4 px-1.5 text-[10px]">z webu</Badge>}
                          {c.cv_path && <button type="button" onClick={() => downloadCv(c.id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"><Download className="size-3" />CV</button>}
                        </div>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <select className={cn(selectClass, 'mt-2 h-7 text-xs')} value={c.stage} disabled={isPending} onChange={(e) => moveStage(c.id, e.target.value)}>
                          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {jobDialog.open && <JobDialog job={jobDialog.job} departments={departments} onClose={() => setJobDialog({ open: false, job: null })} />}
      {showCand && <CandidateDialog jobs={jobs} onClose={() => setShowCand(false)} />}

      {/* Candidate detail */}
      {detail && (
        <Dialog open onOpenChange={(o) => { if (!o) setDetail(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{detail.name}<Badge variant={detail.stage === 'hired' ? 'success' : detail.stage === 'rejected' ? 'secondary' : 'info'}>{stageLabel(detail.stage)}</Badge></DialogTitle>
              <DialogDescription>{detail.job_title || 'Bez navázané pozice'}{detail.source === 'web' ? ' · přihláška z webu' : ' · ručně přidán'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.email && <a href={`mailto:${detail.email}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-foreground hover:bg-muted"><Mail className="size-4 text-muted-foreground" />{detail.email}</a>}
                {detail.phone && <a href={`tel:${detail.phone}`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-foreground hover:bg-muted"><Phone className="size-4 text-muted-foreground" />{detail.phone}</a>}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground"><CalendarClock className="size-4" />Přihlášeno {fmtDateTime(detail.created_at)}</div>
              {detail.cover_letter && (
                <div><div className="mb-1 text-xs font-medium text-muted-foreground">Zpráva uchazeče</div><p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-foreground">{detail.cover_letter}</p></div>
              )}
              {detail.notes && (
                <div><div className="mb-1 text-xs font-medium text-muted-foreground">Poznámka</div><p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-foreground">{detail.notes}</p></div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {detail.cv_path && <Button variant="outline" size="sm" disabled={isPending} onClick={() => downloadCv(detail.id)}><FileText className="size-4" />Stáhnout CV</Button>}
                <div className="ml-auto flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Fáze</Label>
                  <select className={cn(selectClass, 'w-40')} value={detail.stage} disabled={isPending} onChange={(e) => moveStage(detail.id, e.target.value)}>
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end border-t border-border pt-3">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => removeCandidate(detail)}><Trash2 className="size-4" />Smazat kandidáta</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function JobDialog({ job, departments, onClose }: { job: any | null; departments: Dept[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!job
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = isEdit ? await updateJob(job.id, fd) : await createJob(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(isEdit ? 'Pozice uložena' : 'Pozice vytvořena'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Upravit pozici' : 'Nová pozice'}</DialogTitle><DialogDescription>Pozice pro nábor i kariérní web.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název pozice</Label><Input name="title" required defaultValue={job?.title || ''} placeholder="např. Brigáda na baru" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Oddělení</Label>
            <select name="departmentId" defaultValue={job?.department_id || 'none'} className={selectClass}>
              <option value="none">—</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Popis role</Label>
            <textarea name="description" rows={7} defaultValue={job?.description || ''} className={taClass} placeholder={'Náplň práce, koho hledáme, co nabízíme…\n\nTip: prázdný řádek = nový odstavec, pomlčkou „- " odrážky. Formátování se zachová na kariérní stránce.'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Lokalita</Label><Input name="location" defaultValue={job?.location || ''} placeholder="Praha / OX Club" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Typ úvazku</Label>
              <select name="employmentType" defaultValue={job?.employment_type || 'brigada'} className={selectClass}>{Object.entries(EMPLOYMENT).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Mzda / odměna</Label><Input name="salaryRange" defaultValue={job?.salary_range || ''} placeholder="např. 150–200 Kč/h" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" name="published" defaultChecked={job ? !!job.published : true} className="size-4 rounded border-input accent-primary" />Publikovat na kariérní stránce (jobs.globaalelevate.com)</label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : isEdit ? 'Uložit' : 'Vytvořit'}</Button>
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
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><textarea name="notes" rows={3} className={taClass} placeholder="Krátká poznámka…" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
