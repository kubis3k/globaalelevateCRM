'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Presentation, MapPin, Users, Clock, Check, CheckCircle2, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  saveMeeting, deleteMeeting, saveMeetingNotes, setMeetingStatus,
  addActionItem, toggleActionItem, deleteActionItem,
} from './actions'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const areaClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const STATUS: Record<string, { label: string; variant: any }> = {
  scheduled: { label: 'Naplánováno', variant: 'info' },
  done: { label: 'Proběhlo', variant: 'success' },
  cancelled: { label: 'Zrušeno', variant: 'secondary' },
}

function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso); if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function MeetingsClient({ meetings, items, canManage }: { meetings: any[]; items: any[]; canManage: boolean }) {
  const [editing, setEditing] = useState<{ item: any | null } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const now = Date.now()
  const upcoming = meetings.filter((m) => m.status === 'scheduled' && new Date(m.starts_at).getTime() >= now - 12 * 3600000)
  const history = meetings.filter((m) => !(m.status === 'scheduled' && new Date(m.starts_at).getTime() >= now - 12 * 3600000))
  const itemsOf = (id: string) => items.filter((it) => it.meeting_id === id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{meetings.length} porad</p>
        <Button size="lg" onClick={() => setEditing({ item: null })}><Plus className="size-4" />Nový meeting</Button>
      </div>

      {meetings.length === 0 ? (
        <EmptyState icon={Presentation} title="Žádné meetingy" description="Naplánuj poradu — přidej program, po skončení napiš zápis a úkoly." />
      ) : (
        <div className="space-y-6">
          <Section title="Nadcházející" empty="Žádné naplánované porady.">
            {upcoming.map((m) => <MeetingCard key={m.id} m={m} items={itemsOf(m.id)} onOpen={() => setOpenId(m.id)} />)}
          </Section>
          <Section title="Historie" empty="Zatím nic v historii.">
            {history.map((m) => <MeetingCard key={m.id} m={m} items={itemsOf(m.id)} onOpen={() => setOpenId(m.id)} />)}
          </Section>
        </div>
      )}

      {editing && <MeetingDialog item={editing.item} onClose={() => setEditing(null)} />}
      {openId && (
        <MeetingDetail
          key={openId}
          m={meetings.find((x) => x.id === openId)}
          items={itemsOf(openId)}
          canManage={canManage}
          onEdit={(it) => { setOpenId(null); setEditing({ item: it }) }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children]
  const has = arr.filter(Boolean).length > 0
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{title}</h2>
      {has ? <div className="grid gap-3 sm:grid-cols-2">{children}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  )
}

function MeetingCard({ m, items, onOpen }: { m: any; items: any[]; onOpen: () => void }) {
  const s = STATUS[m.status] || STATUS.scheduled
  const done = items.filter((i) => i.done).length
  return (
    <button onClick={onOpen} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-ring/50">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-foreground">{m.title}</span>
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{fmtDateTime(m.starts_at)}</span>
        {m.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{m.location}</span>}
        {m.attendees && <span className="inline-flex items-center gap-1 truncate"><Users className="size-3.5" />{m.attendees}</span>}
      </div>
      {items.length > 0 && <span className="text-xs text-muted-foreground">Úkoly: {done}/{items.length}</span>}
    </button>
  )
}

function MeetingDialog({ item, onClose }: { item: any | null; onClose: () => void }) {
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const r = await saveMeeting(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success(item ? 'Meeting upraven' : 'Meeting naplánován'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Upravit meeting' : 'Nový meeting'}</DialogTitle><DialogDescription>Porada, schůzka, briefing…</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {item && <input type="hidden" name="id" value={item.id} />}
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required defaultValue={item?.title ?? ''} placeholder="Týdenní porada produkce" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Začátek</Label><input type="datetime-local" name="startsAt" required defaultValue={toLocalInput(item?.starts_at)} className={selectClass} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Konec</Label><input type="datetime-local" name="endsAt" defaultValue={toLocalInput(item?.ends_at)} className={selectClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Místo</Label><Input name="location" defaultValue={item?.location ?? ''} placeholder="Kancelář / Google Meet" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue={item?.status ?? 'scheduled'} className={selectClass}>
                {Object.entries(STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Účastníci</Label><Input name="attendees" defaultValue={item?.attendees ?? ''} placeholder="Jana, Petr, produkce…" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Program (agenda)</Label><textarea name="agenda" defaultValue={item?.agenda ?? ''} rows={4} className={areaClass} placeholder={'1. Shrnutí minulé akce\n2. Rozpočet\n3. Příští akce'} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : item ? 'Uložit' : 'Naplánovat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MeetingDetail({ m, items, canManage, onEdit, onClose }: { m: any; items: any[]; canManage: boolean; onEdit: (it: any) => void; onClose: () => void }) {
  const [pending, start] = useTransition()
  const [notes, setNotes] = useState<string>(m?.notes ?? '')
  const [newItem, setNewItem] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  if (!m) return null
  const s = STATUS[m.status] || STATUS.scheduled

  const run = (fn: () => Promise<{ error?: string }>, ok?: string) => start(async () => {
    const r = await fn(); if (r?.error) toast.error('Chyba', r.error); else if (ok) toast.success(ok)
  })

  async function remove() {
    const okc = await confirmDialog({ title: `Smazat meeting „${m.title}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!okc) return
    start(async () => { const r = await deleteMeeting(m.id); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Meeting smazán'); onClose() } })
  }
  function addItem() {
    const t = newItem.trim(); if (!t) return
    start(async () => {
      const r = await addActionItem(m.id, t, newAssignee)
      if (r?.error) { toast.error('Chyba', r.error); return }
      setNewItem(''); setNewAssignee('')
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-6">
            <DialogTitle>{m.title}</DialogTitle>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
          <DialogDescription>{fmtDateTime(m.starts_at)}{m.ends_at ? ` – ${fmtDateTime(m.ends_at)}` : ''}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(m.location || m.attendees) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {m.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{m.location}</span>}
              {m.attendees && <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{m.attendees}</span>}
            </div>
          )}

          {m.agenda && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Program</Label>
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">{m.agenda}</p>
            </div>
          )}

          {/* Quick status */}
          <div className="flex flex-wrap gap-2">
            {m.status !== 'done' && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMeetingStatus(m.id, 'done'), 'Označeno jako proběhlé')}><CheckCircle2 className="size-4" />Proběhlo</Button>}
            {m.status !== 'scheduled' && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMeetingStatus(m.id, 'scheduled'), 'Vráceno na naplánováno')}><Clock className="size-4" />Naplánováno</Button>}
            {m.status !== 'cancelled' && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMeetingStatus(m.id, 'cancelled'), 'Meeting zrušen')}><Ban className="size-4" />Zrušit</Button>}
          </div>

          {/* Zápis */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Zápis z porady</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className={areaClass} placeholder="Co se probralo, k čemu se došlo…" />
            <div className="flex justify-end">
              <Button size="sm" disabled={pending} onClick={() => run(() => saveMeetingNotes(m.id, notes), 'Zápis uložen')}><Check className="size-4" />Uložit zápis</Button>
            </div>
          </div>

          {/* Úkoly */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Úkoly z porady</Label>
            <div className="space-y-1.5">
              {items.length === 0 && <p className="text-sm text-muted-foreground">Zatím žádné úkoly.</p>}
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                  <button type="button" aria-label="Hotovo" disabled={pending} onClick={() => run(() => toggleActionItem(it.id, !it.done))}
                    className={cn('flex size-5 shrink-0 items-center justify-center rounded border', it.done ? 'border-success bg-success text-white' : 'border-input')}>
                    {it.done && <Check className="size-3.5" />}
                  </button>
                  <span className={cn('flex-1 text-sm', it.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {it.text}{it.assignee ? <span className="text-muted-foreground"> · {it.assignee}</span> : null}
                  </span>
                  <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={pending} onClick={() => run(() => deleteActionItem(it.id))}><Trash2 className="size-3.5" /></Button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Nový úkol" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} />
              <Input value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} placeholder="Odpovědný" className="sm:w-40" />
              <Button size="default" disabled={pending || !newItem.trim()} onClick={addItem}><Plus className="size-4" />Přidat</Button>
            </div>
          </div>

          <div className="flex justify-between gap-2 border-t border-border pt-3">
            {canManage
              ? <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={pending} onClick={remove}><Trash2 className="size-4" />Smazat</Button>
              : <span />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={() => onEdit(m)}><Pencil className="size-4" />Upravit</Button>
              <Button size="sm" onClick={onClose}>Hotovo</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
