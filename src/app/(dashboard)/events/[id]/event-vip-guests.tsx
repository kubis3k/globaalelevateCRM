'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Crown, Users, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveReservation, deleteReservation, setReservationStatus, saveGuest, deleteGuest, setGuestArrived, setGuestFlag } from '../actions'

const selectClass = 'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)
const BOX: Record<string, { label: string; color: string }> = { diamond: { label: 'Diamond', color: '#b56bff' }, gold: { label: 'Gold', color: '#f4b740' }, silver: { label: 'Silver', color: '#94a3b8' }, other: { label: 'Jiný', color: '#64748b' } }
const RES_STATUS: Record<string, string> = { pending: 'Čeká', confirmed: 'Potvrzeno', seated: 'Usazeno', cancelled: 'Zrušeno', no_show: 'Nedorazil' }
const GUEST_TYPE: Record<string, string> = { guest: 'Host', press: 'Press', artist: 'Umělec', staff: 'Štáb', promoter: 'Promotér' }

// ── VIP rezervace ──
export function VipSection({ eventId, reservations, canManage }: { eventId: string; reservations: any[]; canManage: boolean }) {
  const [dialog, setDialog] = useState<{ open: boolean; r: any | null }>({ open: false, r: null })
  const [pending, startTransition] = useTransition()
  const totalSpend = reservations.filter((r) => r.status !== 'cancelled').reduce((a, r) => a + Number(r.min_spend || 0), 0)

  function status(r: any, v: string) { startTransition(async () => { const res = await setReservationStatus(r.id, v); if (res?.error) toast.error('Chyba', res.error) }) }
  function remove(r: any) {
    confirmDialog({ title: 'Smazat rezervaci?', description: `${BOX[r.box_type]?.label} · ${r.guest_name || ''}`, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (ok) startTransition(async () => { const res = await deleteReservation(r.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Smazáno') })
    })
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Crown className="size-4" />VIP rezervace <span className="text-xs font-normal text-muted-foreground">({reservations.length}{totalSpend > 0 ? ` · min. útrata ${czk(totalSpend)}` : ''})</span></h3>
        {canManage && <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, r: null })}><Plus className="size-4" />Rezervace</Button>}
      </div>
      <div className="space-y-1.5">
        {reservations.length === 0 && <p className="text-sm text-muted-foreground">Zatím žádné VIP rezervace.</p>}
        {reservations.map((r) => {
          const b = BOX[r.box_type] || BOX.other
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span className="rounded px-1.5 py-0.5 text-xs font-bold" style={{ background: b.color + '22', color: b.color }}>{b.label}{r.box_label ? ` ${r.box_label}` : ''}</span>
              <span className="font-medium text-foreground">{r.guest_name || 'Bez jména'}</span>
              <span className="text-xs text-muted-foreground"><Users className="mr-0.5 inline size-3" />{r.party_size}{r.contact ? ` · ${r.contact}` : ''}</span>
              {r.min_spend != null && <span className="text-xs tabular-nums text-muted-foreground">{czk(Number(r.min_spend))}</span>}
              <div className="ml-auto flex items-center gap-1">
                {canManage ? (
                  <select value={r.status} onChange={(e) => status(r, e.target.value)} className={selectClass} disabled={pending}>{Object.entries(RES_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                ) : <Badge variant="outline">{RES_STATUS[r.status]}</Badge>}
                {canManage && <><Button variant="ghost" size="icon-sm" onClick={() => setDialog({ open: true, r })}><Edit2 className="size-3.5" /></Button><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => remove(r)}><Trash2 className="size-3.5" /></Button></>}
              </div>
            </div>
          )
        })}
      </div>
      {dialog.open && canManage && <ReservationDialog eventId={eventId} r={dialog.r} onClose={() => setDialog({ open: false, r: null })} />}
    </section>
  )
}

function ReservationDialog({ eventId, r, onClose }: { eventId: string; r: any | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget); fd.set('eventId', eventId)
    startTransition(async () => { const res = await saveReservation(fd); if (res?.error) toast.error('Chyba', res.error); else { toast.success('Uloženo'); onClose() } })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{r ? 'Upravit rezervaci' : 'Nová VIP rezervace'}</DialogTitle><DialogDescription>Box, host a bottle service.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {r && <input type="hidden" name="id" value={r.id} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Box</Label><select name="boxType" defaultValue={r?.box_type || 'silver'} className={cn(selectClass, 'h-9 w-full')}>{Object.entries(BOX).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}</select></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Označení boxu</Label><Input name="boxLabel" defaultValue={r?.box_label || ''} placeholder="Box 3" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Host</Label><Input name="guestName" defaultValue={r?.guest_name || ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Kontakt</Label><Input name="contact" defaultValue={r?.contact || ''} placeholder="tel. / e-mail" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Počet osob</Label><Input type="number" min={1} name="partySize" defaultValue={r?.party_size ?? 4} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Stav</Label><select name="status" defaultValue={r?.status || 'pending'} className={cn(selectClass, 'h-9 w-full')}>{Object.entries(RES_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Min. útrata (Kč)</Label><Input type="number" step="0.01" name="minSpend" defaultValue={r?.min_spend ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Záloha (Kč)</Label><Input type="number" step="0.01" name="deposit" defaultValue={r?.deposit ?? ''} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" defaultValue={r?.note || ''} /></div>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Guest list ──
const FLAG_BTN = 'flex items-center gap-1 rounded-4xl border px-1.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-default'

export function GuestSection({ eventId, guests, canManage }: { eventId: string; guests: any[]; canManage: boolean }) {
  const [pending, startTransition] = useTransition()
  const heads = guests.reduce((a, g) => a + Number(g.party_size || 1), 0)
  const arrived = guests.filter((g) => g.arrived).reduce((a, g) => a + Number(g.party_size || 1), 0)
  const vipCount = guests.filter((g) => g.is_vip).length
  const permCount = guests.filter((g) => g.is_permanent).length

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); fd.set('eventId', eventId)
    startTransition(async () => { const r = await saveGuest(fd); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Přidáno'); form.reset() } })
  }
  function toggle(g: any) { startTransition(async () => { const r = await setGuestArrived(g.id, !g.arrived); if (r?.error) toast.error('Chyba', r.error) }) }
  function toggleFlag(g: any, field: 'is_vip' | 'is_permanent') { startTransition(async () => { const r = await setGuestFlag(g.id, field, !g[field]); if (r?.error) toast.error('Chyba', r.error) }) }
  function remove(g: any) { startTransition(async () => { const r = await deleteGuest(g.id); if (r?.error) toast.error('Chyba', r.error) }) }

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Users className="size-4" />Guest list <span className="text-xs font-normal text-muted-foreground">({guests.length} jmen · {heads} osob · dorazilo {arrived}{vipCount ? ` · VIP ${vipCount}` : ''}{permCount ? ` · permostálých ${permCount}` : ''})</span></h3>
      <div className="space-y-1">
        {guests.length === 0 && <p className="text-sm text-muted-foreground">Zatím prázdný guest list.</p>}
        {guests.map((g) => (
          <div key={g.id} className={cn('flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm', g.arrived ? 'bg-success/5' : 'bg-card')}>
            {canManage && <button onClick={() => toggle(g)} disabled={pending} title="Dorazil/a" className={cn('flex size-5 shrink-0 items-center justify-center rounded border', g.arrived ? 'border-success bg-success text-success-foreground' : 'border-input text-transparent')}><Check className="size-3.5" /></button>}
            <span className={cn('font-medium', g.arrived ? 'text-muted-foreground' : 'text-foreground')}>{g.name}</span>
            {g.party_size > 1 && <span className="text-xs text-muted-foreground">+{g.party_size - 1}</span>}
            <Badge variant="outline">{GUEST_TYPE[g.type] || g.type}</Badge>
            <button onClick={() => canManage && toggleFlag(g, 'is_vip')} disabled={pending || !canManage} title="VIP" className={cn(FLAG_BTN, g.is_vip ? 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'border-dashed border-border text-muted-foreground')}>
              <Star className={cn('size-3', g.is_vip && 'fill-current')} />VIP
            </button>
            <button onClick={() => canManage && toggleFlag(g, 'is_permanent')} disabled={pending || !canManage} title="Permostálý" className={cn(FLAG_BTN, g.is_permanent ? 'border-transparent bg-info/15 text-info' : 'border-dashed border-border text-muted-foreground')}>
              <Check className={cn('size-3', !g.is_permanent && 'opacity-0')} />Permostálý
            </button>
            {canManage && <button onClick={() => remove(g)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>}
          </div>
        ))}
      </div>
      {canManage && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-1.5 rounded-lg border border-dashed border-border p-2">
          <Input name="name" placeholder="Jméno hosta" className="h-8 min-w-32 flex-1" required />
          <Input name="partySize" type="number" min={1} defaultValue={1} className="h-8 w-16" title="Počet osob" />
          <select name="type" defaultValue="guest" className={selectClass}>{Object.entries(GUEST_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <label className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2 text-sm text-foreground"><input type="checkbox" name="isVip" className="size-3.5" />VIP</label>
          <label className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2 text-sm text-foreground"><input type="checkbox" name="isPermanent" className="size-3.5" />Permostálý</label>
          <Button type="submit" size="sm" disabled={pending}><Plus className="size-4" /></Button>
        </form>
      )}
    </section>
  )
}
