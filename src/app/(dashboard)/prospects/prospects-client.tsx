'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Plus, Edit2, Trash2, Magnet, Loader2, ArrowRight, CalendarClock, PhoneCall, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  createProspect, updateProspect, deleteProspect, logTouch, convertProspectToClient,
  setProspectStatus, assignProspectOwner,
} from './actions'
import { lookupAres } from '../crm/actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'info' | 'warning' | 'destructive' | 'outline'

const SOURCE_LABEL: Record<string, string> = {
  maps: 'Mapy', firmy: 'Firmy.cz', rejstrik: 'Rejstřík', referral: 'Doporučení', ig: 'Instagram', osobni: 'Osobní', jine: 'Jiné',
}
const STATUS: Record<string, { variant: BadgeVariant; label: string }> = {
  new: { variant: 'info', label: 'Nový' },
  contacted: { variant: 'secondary', label: 'Kontaktován' },
  replied: { variant: 'success', label: 'Odpověděl' },
  qualified: { variant: 'success', label: 'Kvalifikován' },
  converted: { variant: 'default', label: 'Konvertován' },
  dead: { variant: 'destructive', label: 'Mrtvý' },
  nurture: { variant: 'warning', label: 'Nurture' },
}
const CHANNEL_LABEL: Record<string, string> = { phone: 'Telefon', dm: 'DM', email: 'E-mail', osobne: 'Osobně', jine: 'Jiné' }
const OUTCOME: Record<string, { variant: BadgeVariant; label: string }> = {
  no_reply: { variant: 'secondary', label: 'Bez odpovědi' },
  replied: { variant: 'success', label: 'Odpověděl' },
  meeting: { variant: 'success', label: 'Schůzka' },
  refused: { variant: 'destructive', label: 'Odmítl' },
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('cs-CZ') : '—')
const scoreVariant = (s: number): BadgeVariant => (s >= 11 ? 'success' : s >= 6 ? 'info' : 'secondary')

type Person = { user_id: string; name: string }

function SignalChips({ signals }: { signals: any }) {
  if (!signals || typeof signals !== 'object') return <span className="text-xs text-muted-foreground">—</span>
  const chips: string[] = []
  if ('pagespeed' in signals) chips.push(`PageSpeed ${signals.pagespeed}`)
  if ('web_year' in signals) chips.push(`Web ${signals.web_year}`)
  if ('pixel' in signals) chips.push(signals.pixel ? 'Pixel ✓' : 'Bez pixelu')
  if ('mobile_ok' in signals) chips.push(signals.mobile_ok ? 'Mobil ✓' : 'Mobil ✗')
  for (const k of Object.keys(signals)) {
    if (['pagespeed', 'web_year', 'pixel', 'mobile_ok'].includes(k)) continue
    const v = signals[k]
    chips.push(`${k}: ${typeof v === 'boolean' ? (v ? 'ano' : 'ne') : v}`)
  }
  if (!chips.length) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => <span key={i} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{c}</span>)}
    </div>
  )
}

export function ProspectsClient({ prospects, people, touches }: { prospects: any[]; people: Person[]; touches: Record<string, any[]> }) {
  const [dialog, setDialog] = useState<{ open: boolean; prospect: any | null }>({ open: false, prospect: null })
  const [detailId, setDetailId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [f, setF] = useState({ status: 'all', source: 'all', owner: 'all', region: '' })

  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const kpi = useMemo(() => ({
    newWeek: prospects.filter((p) => (p.created_at || '').slice(0, 10) >= weekAgo).length,
    due: prospects.filter((p) => p.next_touch_at && p.next_touch_at <= today && !['converted', 'dead'].includes(p.status)).length,
    replied: prospects.filter((p) => p.status === 'replied').length,
    convertedMonth: prospects.filter((p) => p.status === 'converted' && (p.updated_at || '').slice(0, 7) === month).length,
  }), [prospects, today, month, weekAgo])

  const dueList = useMemo(() =>
    prospects
      .filter((p) => p.next_touch_at && p.next_touch_at <= today && !['converted', 'dead'].includes(p.status))
      .sort((a, b) => (b.score || 0) - (a.score || 0)),
  [prospects, today])

  const filtered = useMemo(() => prospects.filter((p) => {
    if (f.status !== 'all' && p.status !== f.status) return false
    if (f.source !== 'all' && p.source !== f.source) return false
    if (f.owner !== 'all' && (f.owner === 'none' ? p.owner : p.owner !== f.owner)) return false
    if (f.region && !(p.region || '').toLowerCase().includes(f.region.toLowerCase())) return false
    return true
  }), [prospects, f])

  const detail = detailId ? prospects.find((p) => p.id === detailId) : null

  async function remove(p: any) {
    const ok = await confirmDialog({ title: `Smazat prospekta „${p.name}"?`, description: 'Smaže i historii doteků.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const r = await deleteProspect(p.id); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Prospekt smazán'); setDetailId(null) } })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Akvizice" description="Prospekti před CRM — scoring, kadence follow-upů a konverze na klienty." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Noví (7 dní)" value={String(kpi.newWeek)} hint="Přidáno tento týden" icon={<Plus className="size-4" />} />
        <StatCard title="K doteku dnes" value={String(kpi.due)} tone={kpi.due > 0 ? 'negative' : 'neutral'} hint="Čekají na kontakt" icon={<CalendarClock className="size-4" />} />
        <StatCard title="Odpovědělo" value={String(kpi.replied)} tone="positive" hint="Reagovali na oslovení" icon={<PhoneCall className="size-4" />} />
        <StatCard title="Konvertováno (měsíc)" value={String(kpi.convertedMonth)} tone="positive" hint="Prospekt → klient" icon={<ArrowRight className="size-4" />} />
      </div>

      {dueList.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Dnes kontaktovat</h2>
            <Badge variant="secondary">{dueList.length}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dueList.slice(0, 12).map((p) => (
              <button key={p.id} onClick={() => setDetailId(p.id)} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/40">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{SOURCE_LABEL[p.source]}{p.region ? ` · ${p.region}` : ''} · {fmtDate(p.next_touch_at)}</div>
                </div>
                <Badge variant={scoreVariant(p.score)}>{p.score}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Stav</Label>
            <select className={selectClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="all">Všechny</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Zdroj</Label>
            <select className={selectClass} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
              <option value="all">Všechny</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Owner</Label>
            <select className={selectClass} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
              <option value="all">Všichni</option>
              <option value="none">Nepřiřazeno</option>
              {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Region</Label>
            <Input className="h-8" placeholder="Hledat…" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} />
          </div>
        </div>
        <Button size="lg" onClick={() => setDialog({ open: true, prospect: null })}><Plus className="size-4" />Nový prospekt</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState icon={Magnet} title="Žádní prospekti" description="Přidejte prospekta ručně nebo přes import API." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subjekt</TableHead><TableHead className="w-16">Skóre</TableHead>
                <TableHead className="hidden lg:table-cell">Signály</TableHead>
                <TableHead className="hidden sm:table-cell">Zdroj</TableHead>
                <TableHead>Stav</TableHead><TableHead className="hidden md:table-cell">Další dotek</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead><TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const st = STATUS[p.status] ?? STATUS.new
                const overdue = p.next_touch_at && p.next_touch_at <= today && !['converted', 'dead'].includes(p.status)
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <button onClick={() => setDetailId(p.id)} className="text-left font-medium text-foreground hover:text-primary hover:underline">{p.name}</button>
                      <div className="text-xs text-muted-foreground">{p.region || ''}{p.ico ? ` · IČO ${p.ico}` : ''}</div>
                    </TableCell>
                    <TableCell><Badge variant={scoreVariant(p.score)}>{p.score}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell"><SignalChips signals={p.signals} /></TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{SOURCE_LABEL[p.source]}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className={cn('hidden md:table-cell tabular-nums', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>{fmtDate(p.next_touch_at)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.owner_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => setDialog({ open: true, prospect: p })}><Edit2 className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(p)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {dialog.open && <ProspectDialog prospect={dialog.prospect} people={people} onClose={() => setDialog({ open: false, prospect: null })} />}
      {detail && <DetailDialog prospect={detail} people={people} touches={touches[detail.id] || []} onClose={() => setDetailId(null)} onEdit={() => { setDialog({ open: true, prospect: detail }); setDetailId(null) }} onRemove={() => remove(detail)} />}
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}

function ProspectDialog({ prospect, people, onClose }: { prospect: any | null; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!prospect
  const [ico, setIco] = useState(prospect?.ico || '')
  const [name, setName] = useState(prospect?.name || '')
  const [dic, setDic] = useState(prospect?.dic || '')
  const [aresLoading, setAresLoading] = useState(false)

  async function fetchAres() {
    if (!ico.trim()) { toast.error('Zadejte IČO'); return }
    setAresLoading(true)
    const res = await lookupAres(ico.trim())
    setAresLoading(false)
    if (res?.error) { toast.error('ARES', res.error); return }
    if (res.data) { setName(res.data.name); if (res.data.dic) setDic(res.data.dic); toast.success('Načteno z ARES') }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = isEdit ? await updateProspect(prospect.id, fd) : await createProspect(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(isEdit ? 'Prospekt uložen' : 'Prospekt přidán')
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? `Upravit: ${prospect.name}` : 'Nový prospekt'}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Název subjektu"><Input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Podnik / firma" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="IČO">
              <div className="flex gap-1.5">
                <Input name="ico" value={ico} onChange={(e) => setIco(e.target.value)} placeholder="8 číslic" />
                <Button type="button" variant="outline" size="sm" disabled={aresLoading} onClick={fetchAres} title="Načíst z ARES">{aresLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'ARES'}</Button>
              </div>
            </Field>
            <Field label="DIČ"><Input name="dic" value={dic} onChange={(e) => setDic(e.target.value)} /></Field>
            <Field label="Region / město"><Input name="region" defaultValue={prospect?.region || ''} placeholder="Praha" /></Field>
            <Field label="Zdroj">
              <select name="source" defaultValue={prospect?.source || 'jine'} className={selectClass}>
                {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="E-mail"><Input type="email" name="email" defaultValue={prospect?.email || ''} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={prospect?.phone || ''} /></Field>
            <Field label="Web"><Input name="website" defaultValue={prospect?.website || ''} placeholder="https://" /></Field>
            <Field label="Instagram"><Input name="instagram" defaultValue={prospect?.instagram || ''} placeholder="@profil" /></Field>
            <Field label="Skóre (0–15)"><Input type="number" name="score" min={0} max={15} defaultValue={prospect?.score ?? 0} /></Field>
            <Field label="Owner">
              <select name="owner" defaultValue={prospect?.owner || 'none'} className={selectClass}>
                <option value="none">—</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Poznámka"><Input name="note" defaultValue={prospect?.note || ''} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : isEdit ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DetailDialog({ prospect, people, touches, onClose, onEdit, onRemove }: { prospect: any; people: Person[]; touches: any[]; onClose: () => void; onEdit: () => void; onRemove: () => void }) {
  const [pending, startTransition] = useTransition()
  const [touchOpen, setTouchOpen] = useState(false)
  const st = STATUS[prospect.status] ?? STATUS.new
  const isConverted = prospect.status === 'converted' || !!prospect.converted_client_id

  function changeStatus(status: string) {
    startTransition(async () => { const r = await setProspectStatus(prospect.id, status); if (r?.error) toast.error('Chyba', r.error) })
  }
  function changeOwner(owner: string) {
    startTransition(async () => { const r = await assignProspectOwner(prospect.id, owner === 'none' ? null : owner); if (r?.error) toast.error('Chyba', r.error) })
  }
  async function convert() {
    const ok = await confirmDialog({ title: `Konvertovat „${prospect.name}" na klienta?`, description: 'Vytvoří CRM klienta a příležitost ve fázi Lead.', confirmLabel: 'Konvertovat' })
    if (!ok) return
    startTransition(async () => {
      const r = await convertProspectToClient(prospect.id)
      if (r?.error) toast.error('Chyba', r.error)
      else { toast.success('Konvertováno na klienta'); onClose() }
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{prospect.name} <Badge variant={scoreVariant(prospect.score)}>Skóre {prospect.score}</Badge> <Badge variant={st.variant}>{st.label}</Badge></DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Zdroj:</span> {SOURCE_LABEL[prospect.source]}</div>
            <div><span className="text-muted-foreground">Region:</span> {prospect.region || '—'}</div>
            <div><span className="text-muted-foreground">IČO / DIČ:</span> {prospect.ico || '—'}{prospect.dic ? ` / ${prospect.dic}` : ''}</div>
            <div><span className="text-muted-foreground">Web:</span> {prospect.website ? <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{prospect.website}</a> : '—'}</div>
            <div><span className="text-muted-foreground">E-mail:</span> {prospect.email || '—'}</div>
            <div><span className="text-muted-foreground">Telefon:</span> {prospect.phone || '—'}</div>
            <div><span className="text-muted-foreground">Instagram:</span> {prospect.instagram || '—'}</div>
            <div><span className="text-muted-foreground">Doteků:</span> {prospect.touch_count} · další {fmtDate(prospect.next_touch_at)}</div>
          </div>

          <div><div className="mb-1.5 text-xs text-muted-foreground">Signály</div><SignalChips signals={prospect.signals} /></div>
          {prospect.note && <div className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">{prospect.note}</div>}

          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Stav</Label>
              <select className={selectClass} defaultValue={prospect.status} disabled={pending} onChange={(e) => changeStatus(e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Owner</Label>
              <select className={selectClass} defaultValue={prospect.owner || 'none'} disabled={pending} onChange={(e) => changeOwner(e.target.value)}>
                <option value="none">—</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </div>
            <Button variant="outline" size="lg" onClick={() => setTouchOpen(true)} disabled={pending}><PhoneCall className="size-4" />Zalogovat dotek</Button>
            {isConverted
              ? <Badge variant="success" className="ml-auto self-center">Konvertováno</Badge>
              : <Button size="lg" className="ml-auto" onClick={convert} disabled={pending}><ArrowRight className="size-4" />Konvertovat na klienta</Button>}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Historie doteků</h3></div>
            {touches.length === 0 ? <p className="text-sm text-muted-foreground">Zatím žádné doteky.</p> : (
              <ul className="space-y-2">
                {touches.map((t) => {
                  const oc = OUTCOME[t.outcome] ?? OUTCOME.no_reply
                  return (
                    <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="font-medium text-foreground">{CHANNEL_LABEL[t.channel]}</span><Badge variant={oc.variant}>{oc.label}</Badge></div>
                        {t.note && <div className="mt-0.5 text-muted-foreground">{t.note}</div>}
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">{fmtDate(t.created_at)}{t.author ? <div>{t.author}</div> : null}</div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex justify-between gap-2 border-t border-border pt-3">
            <Button variant="ghost" size="lg" className="text-muted-foreground hover:text-destructive" onClick={onRemove} disabled={pending}><Trash2 className="size-4" />Smazat</Button>
            <Button variant="outline" size="lg" onClick={onEdit}><Edit2 className="size-4" />Upravit</Button>
          </div>
        </div>

        {touchOpen && <TouchDialog prospectId={prospect.id} onClose={() => setTouchOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function TouchDialog({ prospectId, onClose }: { prospectId: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const channel = String(fd.get('channel') || 'jine')
    const outcome = String(fd.get('outcome') || 'no_reply')
    const note = String(fd.get('note') || '')
    startTransition(async () => {
      const r = await logTouch(prospectId, channel, outcome, note)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success('Dotek zaznamenán'); onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Zalogovat dotek</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kanál">
              <select name="channel" className={selectClass} defaultValue="phone">
                {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Výsledek">
              <select name="outcome" className={selectClass} defaultValue="no_reply">
                {Object.entries(OUTCOME).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Poznámka"><Input name="note" placeholder="Volitelně…" /></Field>
          <p className="text-xs text-muted-foreground">Kadence se posune automaticky: 1.→+3 dny, 2.→+4, 3.→+7; po 4. bez odpovědi → nurture. Odpověď/schůzka kadenci ukončí.</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Zaznamenat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
