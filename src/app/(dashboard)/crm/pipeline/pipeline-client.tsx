'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createDeal, setDealStage, deleteDeal } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const STAGES: { id: string; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Kvalifikováno' },
  { id: 'proposal', label: 'Nabídka' },
  { id: 'negotiation', label: 'Jednání' },
  { id: 'won', label: 'Vyhráno' },
  { id: 'lost', label: 'Prohráno' },
]
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)

type Client = { id: string; name: string }
type Person = { user_id: string; name: string }

export function PipelineClient({ deals, clients, people }: { deals: any[]; clients: Client[]; people: Person[] }) {
  const [showDeal, setShowDeal] = useState(false)
  const [isPending, startTransition] = useTransition()

  function move(id: string, stage: string) {
    startTransition(async () => { const res = await setDealStage(id, stage); if (res?.error) toast.error('Chyba', res.error) })
  }
  async function remove(d: any) {
    const ok = await confirmDialog({ title: `Smazat příležitost „${d.title}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteDeal(d.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Příležitost smazána') })
  }

  const openValue = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((a, d) => a + Number(d.value || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{deals.length} příležitostí · otevřená hodnota <span className="font-semibold tabular-nums text-foreground">{czk(openValue)}</span></p>
        <Button size="lg" onClick={() => setShowDeal(true)}><Plus className="size-4" />Nová příležitost</Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const list = deals.filter((d) => d.stage === stage.id)
          const total = list.reduce((a, d) => a + Number(d.value || 0), 0)
          return (
            <div key={stage.id} className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-2">
              <div className="flex items-center justify-between px-1 py-1.5">
                <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{list.length}</Badge>
              </div>
              {total > 0 && <div className="px-1 pb-1.5 text-[11px] tabular-nums text-muted-foreground">{czk(total)}</div>}
              <div className="space-y-2">
                {list.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border bg-card p-2.5 shadow-xs">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                        {d.client_name && <div className="truncate text-xs text-muted-foreground">{d.client_name}</div>}
                      </div>
                      <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(d)}><Trash2 className="size-3.5" /></Button>
                    </div>
                    {d.value != null && <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{czk(Number(d.value), d.currency)}</div>}
                    {d.owner_name && <div className="text-[11px] text-muted-foreground">{d.owner_name}</div>}
                    <select className={cn(selectClass, 'mt-2 h-7 text-xs')} value={d.stage} disabled={isPending} onChange={(e) => move(d.id, e.target.value)}>
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

      {showDeal && <DealDialog clients={clients} people={people} onClose={() => setShowDeal(false)} />}
    </div>
  )
}

function DealDialog({ clients, people, onClose }: { clients: Client[]; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await createDeal(fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Příležitost vytvořena'); onClose() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nová příležitost</DialogTitle><DialogDescription>Obchodní případ v pipeline.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required placeholder="např. Web pro ABC s.r.o." /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Klient</Label>
            <select name="clientId" defaultValue="none" className={selectClass}>
              <option value="none">— bez klienta —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Hodnota</Label><Input type="number" step="0.01" name="value" placeholder="0" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fáze</Label>
              <select name="stage" defaultValue="lead" className={selectClass}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Vlastník</Label>
              <select name="ownerId" defaultValue="none" className={selectClass}><option value="none">—</option>{people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Očekávané uzavření</Label><Input type="date" name="expectedClose" /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Vytvořit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
