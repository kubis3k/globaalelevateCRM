'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, FileSignature, Download, Check, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveContract, deleteContract, acknowledgeContract, getContractUrl } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const TYPES: Record<string, string> = { hpp: 'HPP', dpp: 'DPP', dpc: 'DPČ', ico: 'IČO / smlouva', other: 'Jiné' }
const STATUS: Record<string, { label: string; variant: 'success' | 'secondary' | 'outline' }> = {
  draft: { label: 'Koncept', variant: 'outline' }, active: { label: 'Aktivní', variant: 'success' }, ended: { label: 'Ukončená', variant: 'secondary' },
}
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'
function daysUntil(d: string | null): number | null { if (!d) return null; return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000) }

type Person = { user_id: string; name: string }
type Contract = any

export function HrContractsClient({ contracts, people, canManage, isAdmin, currentUserId }: {
  contracts: Contract[]; people: Person[]; canManage: boolean; isAdmin: boolean; currentUserId: string
}) {
  const [dialog, setDialog] = useState<{ open: boolean; contract: Contract | null }>({ open: false, contract: null })
  const [pending, startTransition] = useTransition()

  async function download(id: string) {
    const res = await getContractUrl(id)
    if (res.error || !res.url) { toast.error('Chyba', res.error || 'Soubor nelze otevřít.'); return }
    window.open(res.url, '_blank', 'noopener,noreferrer')
  }
  function ack(ct: Contract) {
    startTransition(async () => { const r = await acknowledgeContract(ct.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smlouva potvrzena') })
  }
  function remove(ct: Contract) {
    confirmDialog({ title: 'Smazat smlouvu?', description: `${TYPES[ct.type] || ct.type} — ${ct.name}. Tato akce je nevratná.`, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const r = await deleteContract(ct.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{contracts.length} {contracts.length === 1 ? 'smlouva' : 'smluv'}</p>
        {canManage && <Button size="lg" onClick={() => setDialog({ open: true, contract: null })}><Plus className="size-4" />Přidat smlouvu</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {contracts.length === 0 ? (
          <EmptyState icon={FileSignature} title="Žádné smlouvy" description={canManage ? 'Přidej pracovní smlouvu nebo dohodu (DPP/DPČ).' : 'Zatím nemáš evidovanou smlouvu.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zaměstnanec</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Platnost</TableHead>
                {isAdmin && <TableHead className="text-right">Sazba / mzda</TableHead>}
                <TableHead>Stav</TableHead>
                <TableHead>Potvrzení</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((ct) => {
                const d = daysUntil(ct.end_date)
                const expiring = ct.status === 'active' && d !== null && d >= 0 && d <= 30
                const expired = ct.status === 'active' && d !== null && d < 0
                const mine = ct.user_id === currentUserId
                return (
                  <TableRow key={ct.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{ct.name}</div>
                      {ct.title && <div className="text-xs text-muted-foreground">{ct.title}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{TYPES[ct.type] || ct.type}</Badge></TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {fmtDate(ct.start_date)} – {fmtDate(ct.end_date)}
                      {expiring && <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">vyprší za {d} d</span>}
                      {expired && <span className="ml-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[11px] font-medium text-destructive">po expiraci</span>}
                    </TableCell>
                    {isAdmin && <TableCell className="text-right tabular-nums text-muted-foreground">{ct.hourly_rate != null ? `${czk(Number(ct.hourly_rate), ct.currency)}/h` : ct.salary != null ? czk(Number(ct.salary), ct.currency) : '—'}</TableCell>}
                    <TableCell><Badge variant={(STATUS[ct.status] || STATUS.draft).variant}>{(STATUS[ct.status] || STATUS.draft).label}</Badge></TableCell>
                    <TableCell>
                      {ct.acknowledged_at
                        ? <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="size-3.5" />Potvrzeno</span>
                        : mine
                          ? <Button size="sm" variant="outline" disabled={pending} onClick={() => ack(ct)}>Potvrdit</Button>
                          : <span className="text-xs text-muted-foreground">Čeká</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {ct.storage_path && <Button variant="ghost" size="icon-sm" aria-label="Stáhnout" onClick={() => download(ct.id)}><Download className="size-3.5" /></Button>}
                        {canManage && <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => setDialog({ open: true, contract: ct })}><Edit2 className="size-3.5" /></Button>}
                        {canManage && <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={pending} onClick={() => remove(ct)}><Trash2 className="size-3.5" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {dialog.open && canManage && (
        <ContractDialog contract={dialog.contract} people={people} isAdmin={isAdmin} onClose={() => setDialog({ open: false, contract: null })} />
      )}
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}

function ContractDialog({ contract, people, isAdmin, onClose }: { contract: Contract | null; people: Person[]; isAdmin: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!contract

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await saveContract(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(isEdit ? 'Smlouva uložena' : 'Smlouva přidána'); onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit smlouvu' : 'Nová smlouva / dohoda'}</DialogTitle>
          <DialogDescription>Eviduj pracovní smlouvu nebo dohodu (DPP/DPČ) vč. platnosti a souboru.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={contract.id} />}
          {!isEdit && (
            <Field label="Zaměstnanec">
              <select name="userId" required defaultValue="" className={selectClass}>
                <option value="" disabled>— vyber —</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Typ">
              <select name="type" defaultValue={contract?.type || 'hpp'} className={selectClass}>
                {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Název / pozice"><Input name="title" defaultValue={contract?.title || ''} placeholder="např. Barman" /></Field>
            <Field label="Platnost od"><Input type="date" name="startDate" defaultValue={contract?.start_date || ''} /></Field>
            <Field label="Platnost do"><Input type="date" name="endDate" defaultValue={contract?.end_date || ''} /></Field>
            <Field label="Týd. úvazek (h)"><Input type="number" step="0.5" min={0} name="weeklyHours" defaultValue={contract?.weekly_hours ?? ''} /></Field>
            {isAdmin && <Field label="Sazba (Kč/h)"><Input type="number" step="0.01" name="hourlyRate" defaultValue={contract?.hourly_rate ?? ''} /></Field>}
            {isAdmin && <Field label="Mzda (hrubá / měsíc)"><Input type="number" step="0.01" name="salary" defaultValue={contract?.salary ?? ''} /></Field>}
            <Field label="Stav">
              <select name="status" defaultValue={contract?.status || 'active'} className={selectClass}>
                <option value="draft">Koncept</option><option value="active">Aktivní</option><option value="ended">Ukončená</option>
              </select>
            </Field>
          </div>
          <Field label="Soubor smlouvy (PDF/obrázek, volitelné, max 10 MB)">
            <input type="file" name="file" accept=".pdf,image/*" className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm" />
          </Field>
          {isEdit && contract?.storage_path && <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Paperclip className="size-3" />Soubor je přiložen — nový nahraješ výběrem výše.</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : isEdit ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
