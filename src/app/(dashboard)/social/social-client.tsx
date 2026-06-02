'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Plus, Edit2, Trash2, RefreshCw, FolderOpen, Film, Image as ImageIcon, X,
  CalendarClock, Send, Undo2, Users, TrendingUp, Megaphone, ExternalLink,
} from 'lucide-react'
import { saveAccount, deleteAccount, recordCounts, syncAccount, savePost, setPostStatus, deletePost } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Account = {
  id: string; platform: string; handle: string | null; display_name: string | null
  profile_url: string | null; followers: number; following: number; posts_count: number
  auto_sync: boolean; last_synced_at: string | null
}
type Post = {
  id: string; content: string | null; media_doc_id: string | null; media_name: string | null
  platforms: string[]; status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_at: string | null; published_at: string | null
}
type Doc = { id: string; name: string; kind: 'image' | 'video' }
type Series = Record<string, { t: number; f: number }[]>

const PLATFORMS: { id: string; label: string; short: string; color: string }[] = [
  { id: 'instagram', label: 'Instagram', short: 'IG', color: '#e1306c' },
  { id: 'facebook', label: 'Facebook', short: 'FB', color: '#1877f2' },
  { id: 'tiktok', label: 'TikTok', short: 'TT', color: '#0ea5e9' },
  { id: 'youtube', label: 'YouTube', short: 'YT', color: '#ff0000' },
  { id: 'x', label: 'X / Twitter', short: 'X', color: '#38bdf8' },
  { id: 'linkedin', label: 'LinkedIn', short: 'in', color: '#0a66c2' },
  { id: 'threads', label: 'Threads', short: '@', color: '#a855f7' },
  { id: 'other', label: 'Jiná', short: '•', color: '#64748b' },
]
const pmeta = (id: string) => PLATFORMS.find((p) => p.id === id) || PLATFORMS[PLATFORMS.length - 1]

const STATUS_META: Record<string, { label: string; variant: 'default' | 'info' | 'secondary' | 'outline' }> = {
  draft: { label: 'Koncept', variant: 'outline' },
  scheduled: { label: 'Naplánováno', variant: 'info' },
  published: { label: 'Publikováno', variant: 'default' },
  failed: { label: 'Chyba', variant: 'secondary' },
}

const nf = new Intl.NumberFormat('cs-CZ')
const fmtDateTime = (iso: string | null) => iso ? new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
function delta7(series: { t: number; f: number }[] | undefined, current: number): number {
  if (!series?.length) return 0
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
  const before = series.filter((p) => p.t <= weekAgo)
  const base = before.length ? before[before.length - 1] : series[0]
  return current - base.f
}

function Sparkline({ data, color }: { data?: { t: number; f: number }[]; color: string }) {
  if (!data || data.length < 2) return <div className="h-8 w-[120px]" />
  const w = 120, h = 32, pad = 3
  const xs = data.map((d) => d.t), ys = data.map((d) => d.f)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const sx = (t: number) => maxX === minX ? w / 2 : pad + (t - minX) / (maxX - minX) * (w - 2 * pad)
  const sy = (f: number) => maxY === minY ? h / 2 : h - pad - (f - minY) / (maxY - minY) * (h - 2 * pad)
  const d = data.map((p, i) => `${i ? 'L' : 'M'}${sx(p.t).toFixed(1)},${sy(p.f).toFixed(1)}`).join(' ')
  return <svg width={w} height={h}><path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" /></svg>
}

export function SocialClient({ accounts, series, posts, documents, canManage }: {
  accounts: Account[]; series: Series; posts: Post[]; documents: Doc[]; canManage: boolean
}) {
  const [tab, setTab] = useState<'overview' | 'accounts' | 'posts'>('overview')
  const [pending, start] = useTransition()

  // account dialogs
  const [accForm, setAccForm] = useState<Account | 'new' | null>(null)
  const editingAcc = accForm && accForm !== 'new' ? accForm : null
  const [countsFor, setCountsFor] = useState<Account | null>(null)

  // post composer
  const [composer, setComposer] = useState(false)
  const [cId, setCId] = useState<string | null>(null)
  const [cContent, setCContent] = useState('')
  const [cPlatforms, setCPlatforms] = useState<string[]>([])
  const [cMedia, setCMedia] = useState<{ id: string; name: string } | null>(null)
  const [cSchedule, setCSchedule] = useState('')
  const [mediaOpen, setMediaOpen] = useState(false)

  const totals = useMemo(() => {
    const followers = accounts.reduce((a, x) => a + (x.followers || 0), 0)
    const growth = accounts.reduce((a, x) => a + delta7(series[x.id], x.followers || 0), 0)
    const scheduled = posts.filter((p) => p.status === 'scheduled').length
    return { followers, growth, scheduled }
  }, [accounts, series, posts])

  function openComposer(p?: Post) {
    setCId(p?.id ?? null)
    setCContent(p?.content ?? '')
    setCPlatforms(p?.platforms ?? [])
    setCMedia(p?.media_doc_id ? { id: p.media_doc_id, name: p.media_name || 'Médium' } : (p?.media_name ? { id: '', name: p.media_name } : null))
    setCSchedule(toLocalInput(p?.scheduled_at ?? null))
    setComposer(true)
  }

  function submitAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const r = await saveAccount(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success('Účet uložen'); setAccForm(null)
    })
  }
  function submitCounts(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget); const id = countsFor!.id
    const f = Number(fd.get('followers') || 0), g = Number(fd.get('following') || 0), p = Number(fd.get('posts_count') || 0)
    start(async () => {
      const r = await recordCounts(id, f, g, p)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success('Počty uloženy do historie'); setCountsFor(null)
    })
  }
  function removeAccount(a: Account) {
    confirmDialog({ title: `Odpojit ${pmeta(a.platform).label}?`, description: 'Účet i historie růstu se odstraní.', confirmLabel: 'Odpojit', destructive: true }).then((ok) => {
      if (!ok) return
      start(async () => { const r = await deleteAccount(a.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Odpojeno') })
    })
  }
  function doSync(a: Account) {
    start(async () => {
      const r = await syncAccount(a.id)
      if (r?.error) { toast.error('Chyba', r.error); return }
      if (r?.message) toast.success(r.message)
    })
  }
  function submitPost() {
    if (!cContent.trim() && !cMedia) { toast.error('Chyba', 'Zadej text nebo přilož médium.'); return }
    if (!cPlatforms.length) { toast.error('Chyba', 'Vyber alespoň jednu síť.'); return }
    const fd = new FormData()
    if (cId) fd.set('id', cId)
    fd.set('content', cContent)
    if (cMedia?.id) fd.set('media_doc_id', cMedia.id)
    if (cMedia?.name) fd.set('media_name', cMedia.name)
    for (const p of cPlatforms) fd.append('platforms', p)
    if (cSchedule) fd.set('scheduled_at', cSchedule)
    start(async () => {
      const r = await savePost(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success(cSchedule ? 'Příspěvek naplánován' : 'Uloženo jako koncept'); setComposer(false)
    })
  }
  function changeStatus(p: Post, status: string, msg: string) {
    start(async () => { const r = await setPostStatus(p.id, status); if (r?.error) toast.error('Chyba', r.error); else toast.success(msg) })
  }
  function removePost(p: Post) {
    confirmDialog({ title: 'Smazat příspěvek?', description: 'Tato akce je nevratná.', confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      start(async () => { const r = await deletePost(p.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
    })
  }

  const tabBtn = (id: typeof tab, label: string) => (
    <button onClick={() => setTab(id)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', tab === id ? 'bg-card text-foreground shadow-xs ring-1 ring-foreground/10' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
          {tabBtn('overview', 'Přehled')}
          {tabBtn('accounts', `Účty (${accounts.length})`)}
          {tabBtn('posts', `Příspěvky (${posts.length})`)}
        </div>
        {canManage && (
          <div className="flex gap-2">
            {tab !== 'posts' && <Button size="sm" onClick={() => setAccForm('new')}><Plus className="size-4" />Připojit účet</Button>}
            {tab === 'posts' && <Button size="sm" onClick={() => openComposer()}><Plus className="size-4" />Nový příspěvek</Button>}
          </div>
        )}
      </div>

      {/* ── Přehled ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Sledující celkem" value={nf.format(totals.followers)} hint={`${accounts.length} připojených profilů`} icon={<Users className="size-4" />} />
            <StatCard title="Růst (7 dní)" value={`${totals.growth >= 0 ? '+' : ''}${nf.format(totals.growth)}`} tone={totals.growth > 0 ? 'positive' : totals.growth < 0 ? 'negative' : 'neutral'} hint="Souhrn napříč sítěmi" icon={<TrendingUp className="size-4" />} />
            <StatCard title="Naplánované příspěvky" value={String(totals.scheduled)} hint="Čekají na publikaci" icon={<CalendarClock className="size-4" />} />
          </div>

          {accounts.length === 0 ? (
            <EmptyState icon={Megaphone} title="Zatím žádné sítě" description={canManage ? 'Připoj první profil přes „Připojit účet".' : 'Profily zatím nikdo nepřipojil.'} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {accounts.map((a) => {
                const m = pmeta(a.platform); const d = delta7(series[a.id], a.followers || 0)
                return (
                  <Card key={a.id}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ background: m.color + '22', color: m.color }}>{m.short}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">{a.display_name || m.label}</span>
                          {a.profile_url && <a href={a.profile_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="size-3.5" /></a>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{a.handle || m.label}</div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-semibold tabular-nums text-foreground">{nf.format(a.followers || 0)}</span>
                          <span className={cn('text-xs tabular-nums', d > 0 ? 'text-success' : d < 0 ? 'text-destructive' : 'text-muted-foreground')}>{d >= 0 ? '+' : ''}{nf.format(d)} / 7d</span>
                        </div>
                      </div>
                      <Sparkline data={series[a.id]} color={m.color} />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Účty ── */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-[12px] text-muted-foreground">
            Živé automatické načítání počtů a auto-publikace vyžadují připojení API klíčů jednotlivých platforem (Meta, TikTok, YouTube…). Zatím počty aktualizuj ručně tlačítkem <b className="text-foreground">Aktualizovat počty</b> — ukládají se do historie růstu. Naplánované příspěvky upozorní management v čas publikace.
          </div>
          {accounts.length === 0 ? (
            <EmptyState icon={Megaphone} title="Žádné připojené účty" description={canManage ? 'Připoj profil přes „Připojit účet".' : 'Spravuje management.'} />
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => {
                const m = pmeta(a.platform)
                return (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ background: m.color + '22', color: m.color }}>{m.short}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{a.display_name || m.label} <span className="text-muted-foreground">· {a.handle || '—'}</span></div>
                      <div className="text-xs text-muted-foreground tabular-nums">{nf.format(a.followers || 0)} sledujících · {nf.format(a.posts_count || 0)} příspěvků{a.last_synced_at ? ` · akt. ${fmtDateTime(a.last_synced_at)}` : ''}</div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setCountsFor(a)}>Aktualizovat počty</Button>
                        <Button size="sm" variant="ghost" onClick={() => doSync(a)} title="Sync přes API"><RefreshCw className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setAccForm(a)}><Edit2 className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => removeAccount(a)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Příspěvky ── */}
      {tab === 'posts' && (
        <div className="space-y-2">
          {posts.length === 0 ? (
            <EmptyState icon={Send} title="Žádné příspěvky" description={canManage ? 'Vytvoř a naplánuj příspěvek na více sítí najednou.' : 'Spravuje management.'} />
          ) : posts.map((p) => {
            const sm = STATUS_META[p.status] || STATUS_META.draft
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant={sm.variant}>{sm.label}</Badge>
                      {p.platforms.map((pl) => { const m = pmeta(pl); return <span key={pl} className="rounded-md px-1.5 py-0.5 text-[11px] font-medium" style={{ background: m.color + '1f', color: m.color }}>{m.label}</span> })}
                      {p.scheduled_at && p.status === 'scheduled' && <span className="text-[11px] text-muted-foreground"><CalendarClock className="mr-1 inline size-3" />{fmtDateTime(p.scheduled_at)}</span>}
                      {p.published_at && p.status === 'published' && <span className="text-[11px] text-muted-foreground">{fmtDateTime(p.published_at)}</span>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{p.content || <span className="text-muted-foreground italic">(bez textu)</span>}</p>
                    {p.media_name && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="size-3.5" />{p.media_name}</div>}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {p.status !== 'published' && <Button size="sm" variant="outline" onClick={() => changeStatus(p, 'published', 'Označeno jako publikované')}><Send className="size-3.5" />Publikováno</Button>}
                      {p.status === 'published' && <Button size="sm" variant="ghost" onClick={() => changeStatus(p, 'draft', 'Vráceno do konceptů')}><Undo2 className="size-3.5" />Vrátit</Button>}
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openComposer(p)}><Edit2 className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => removePost(p)}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Account form dialog ── */}
      {accForm && (
        <Dialog open onOpenChange={(o) => { if (!o) setAccForm(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAcc ? 'Upravit účet' : 'Připojit účet'}</DialogTitle>
              <DialogDescription>Profil sociální sítě a aktuální počty (uloží se do historie růstu).</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitAccount} className="space-y-3">
              {editingAcc && <input type="hidden" name="id" value={editingAcc.id} />}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Platforma</Label>
                  <select name="platform" defaultValue={editingAcc?.platform || 'instagram'} className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Název</Label>
                  <Input name="display_name" defaultValue={editingAcc?.display_name || ''} placeholder="OX Club Prague" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Handle</Label><Input name="handle" defaultValue={editingAcc?.handle || ''} placeholder="@oxclubprague" /></div>
                <div className="space-y-1"><Label className="text-xs">URL profilu</Label><Input name="profile_url" defaultValue={editingAcc?.profile_url || ''} placeholder="https://instagram.com/…" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Sledující</Label><Input name="followers" type="number" min={0} defaultValue={editingAcc?.followers ?? 0} /></div>
                <div className="space-y-1"><Label className="text-xs">Sleduje</Label><Input name="following" type="number" min={0} defaultValue={editingAcc?.following ?? 0} /></div>
                <div className="space-y-1"><Label className="text-xs">Příspěvků</Label><Input name="posts_count" type="number" min={0} defaultValue={editingAcc?.posts_count ?? 0} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setAccForm(null)}>Zrušit</Button>
                <Button type="submit" disabled={pending}>{editingAcc ? 'Uložit' : 'Připojit'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Update counts dialog ── */}
      {countsFor && (
        <Dialog open onOpenChange={(o) => { if (!o) setCountsFor(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aktualizovat počty · {pmeta(countsFor.platform).label}</DialogTitle>
              <DialogDescription>Zadej aktuální čísla z profilu. Uloží se snímek pro graf růstu.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submitCounts} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Sledující</Label><Input name="followers" type="number" min={0} defaultValue={countsFor.followers ?? 0} autoFocus /></div>
                <div className="space-y-1"><Label className="text-xs">Sleduje</Label><Input name="following" type="number" min={0} defaultValue={countsFor.following ?? 0} /></div>
                <div className="space-y-1"><Label className="text-xs">Příspěvků</Label><Input name="posts_count" type="number" min={0} defaultValue={countsFor.posts_count ?? 0} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setCountsFor(null)}>Zrušit</Button>
                <Button type="submit" disabled={pending}>Uložit</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Post composer dialog ── */}
      {composer && (
        <Dialog open onOpenChange={(o) => { if (!o) setComposer(false) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{cId ? 'Upravit příspěvek' : 'Nový příspěvek'}</DialogTitle>
              <DialogDescription>Napiš obsah, vyber sítě a případně naplánuj čas publikace.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <textarea value={cContent} onChange={(e) => setCContent(e.target.value)} rows={4} placeholder="Text příspěvku…" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />

              <div className="space-y-1.5">
                <Label className="text-xs">Sítě</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => {
                    const on = cPlatforms.includes(p.id)
                    return <button type="button" key={p.id} onClick={() => setCPlatforms((s) => on ? s.filter((x) => x !== p.id) : [...s, p.id])} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors', on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground')}><span className="font-bold" style={{ color: p.color }}>{p.short}</span>{p.label}</button>
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setMediaOpen(true)}><FolderOpen className="size-4" />{cMedia ? 'Změnit médium' : 'Přiložit médium'}</Button>
                {cMedia && <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground"><ImageIcon className="size-3.5" />{cMedia.name}<button onClick={() => setCMedia(null)} className="ml-0.5 hover:text-destructive"><X className="size-3" /></button></span>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Naplánovat na (nepovinné)</Label>
                <Input type="datetime-local" value={cSchedule} onChange={(e) => setCSchedule(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Bez času se uloží jako koncept. S časem se naplánuje a management dostane upozornění v čas publikace.</p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setComposer(false)}>Zrušit</Button>
                <Button type="button" disabled={pending} onClick={submitPost}>{cSchedule ? <><CalendarClock className="size-4" />Naplánovat</> : <>Uložit koncept</>}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Media picker (from Documents) ── */}
      {mediaOpen && (
        <Dialog open onOpenChange={(o) => { if (!o) setMediaOpen(false) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vybrat médium z Dokumentů</DialogTitle>
              <DialogDescription>Obrázky a videa uložená v modulu Dokumenty (např. export z Animací).</DialogDescription>
            </DialogHeader>
            {documents.length === 0 ? (
              <EmptyState icon={FolderOpen} title="Žádná média" description="Ulož obrázek/video do Dokumentů, pak ho tu vybereš." />
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {documents.map((d) => (
                  <button key={d.id} onClick={() => { setCMedia({ id: d.id, name: d.name }); setMediaOpen(false) }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted">
                    {d.kind === 'video' ? <Film className="size-4 shrink-0 text-primary" /> : <ImageIcon className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate text-foreground">{d.name}</span>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
