'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Eye, EyeOff, DoorOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { invitePortalUser, deletePortalUser, setPortalClient, togglePortalVisibility } from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

type Opt = { id: string; name: string }
type ShareItem = { id: string; name: string; event_date?: string | null; hidden: boolean }
type PortalUser = { user_id: string; username: string | null; display_name: string; client_id: string | null; client_name: string | null; events: ShareItem[]; documents: ShareItem[] }

export function PortalAdminClient({ users, clients }: { users: PortalUser[]; clients: Opt[] }) {
  const router = useRouter()
  const [showInvite, setShowInvite] = useState(false)
  const [manage, setManage] = useState<PortalUser | null>(null)
  const [isPending, start] = useTransition()

  function changeClient(u: PortalUser, clientId: string) {
    start(async () => { const r = await setPortalClient(u.user_id, clientId); if (r?.error) toast.error('Chyba', r.error); else router.refresh() })
  }
  async function remove(u: PortalUser) {
    const ok = await confirmDialog({ title: `Smazat přístup „${u.display_name}"?`, description: 'Smaže se i přihlašovací účet klienta.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deletePortalUser(u.user_id); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Smazáno'); router.refresh() } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{users.length} klientů s přístupem do portálu</p>
        <Button size="lg" onClick={() => setShowInvite(true)}><Plus className="size-4" />Pozvat klienta</Button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Žádné portálové účty" description="Pozvi promotéra nebo klienta pronájmu — automaticky uvidí vše navázané na jeho firmu v CRM." />
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {users.map((u) => {
            const visEvents = u.events.filter((e) => !e.hidden).length
            const visDocs = u.documents.filter((d) => !d.hidden).length
            return (
              <div key={u.user_id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">{u.display_name} {u.username && <span className="text-xs text-muted-foreground">· {u.username}</span>}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{visEvents} akcí</Badge>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{visDocs} dokumentů</Badge>
                    {!u.client_id && <Badge variant="warning" className="h-4 px-1.5 text-[10px]">Bez klienta — nic neuvidí</Badge>}
                  </div>
                </div>
                <select value={u.client_id ?? 'none'} disabled={isPending} onChange={(e) => changeClient(u, e.target.value)} className={selectClass} style={{ width: 'auto' }}>
                  <option value="none">— bez klienta —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button variant="outline" size="sm" disabled={!u.client_id} onClick={() => setManage(u)}><Eye className="size-3.5" />Co vidí</Button>
                <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(u)}><Trash2 className="size-4" /></Button>
              </div>
            )
          })}
        </div>
      )}

      {showInvite && <InviteDialog clients={clients} onClose={() => setShowInvite(false)} onDone={() => router.refresh()} />}
      {manage && <VisibilityDialog user={manage} onClose={() => setManage(null)} />}
    </div>
  )
}

function InviteDialog({ clients, onClose, onDone }: { clients: Opt[]; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => { const r = await invitePortalUser(fd); if (r?.error) { toast.error('Chyba', r.error); return } toast.success('Klient pozván'); onClose(); onDone() })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pozvat klienta do portálu</DialogTitle><DialogDescription>Vytvoří přihlašovací účet (role „external"). Přiřazením ke klientovi v CRM se mu automaticky zobrazí jeho akce, dokumenty a smlouvy.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Jméno (zobrazení)</Label><Input name="displayName" placeholder="např. Promotér ABC" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Uživatelské jméno</Label><Input name="username" required placeholder="login" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Heslo</Label><Input name="password" type="text" required placeholder="min. 6 znaků" /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Propojit s klientem (CRM)</Label>
            <select name="clientId" defaultValue="none" className={selectClass}>
              <option value="none">— bez klienta —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Zakládám…' : 'Pozvat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VisibilityDialog({ user, onClose }: { user: PortalUser; onClose: () => void }) {
  const [events, setEvents] = useState(user.events)
  const [docs, setDocs] = useState(user.documents)
  const [, start] = useTransition()

  function toggle(kind: 'event' | 'document', id: string, hidden: boolean) {
    if (!user.client_id) return
    const setFn = kind === 'event' ? setEvents : setDocs
    setFn((list: ShareItem[]) => list.map((x) => (x.id === id ? { ...x, hidden } : x)))
    start(async () => { const r = await togglePortalVisibility(user.client_id!, kind, id, hidden); if (r?.error) toast.error('Chyba', r.error) })
  }

  function Row({ item, kind }: { item: ShareItem; kind: 'event' | 'document' }) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
        <span className={`flex-1 truncate ${item.hidden ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.name}</span>
        {item.event_date && <span className="text-xs text-muted-foreground">{new Date(item.event_date).toLocaleDateString('cs-CZ')}</span>}
        <Button variant="ghost" size="icon-xs" aria-label={item.hidden ? 'Zobrazit klientovi' : 'Skrýt před klientem'} title={item.hidden ? 'Skryto — kliknutím zobrazíte' : 'Viditelné — kliknutím skryjete'} onClick={() => toggle(kind, item.id, !item.hidden)}>
          {item.hidden ? <EyeOff className="size-3.5 text-muted-foreground" /> : <Eye className="size-3.5 text-primary" />}
        </Button>
      </div>
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Co vidí: {user.display_name}</DialogTitle><DialogDescription>Automaticky vidí vše navázané na klienta „{user.client_name}". Kliknutím na oko můžete jednotlivou položku výjimečně skrýt.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Akce ({events.length})</div>
            {events.length === 0 ? <p className="text-sm text-muted-foreground">Klient nemá žádnou navázanou akci.</p> : (
              <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">{events.map((e) => <Row key={e.id} item={e} kind="event" />)}</div>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dokumenty ({docs.length})</div>
            {docs.length === 0 ? <p className="text-sm text-muted-foreground">Klient nemá žádný navázaný dokument.</p> : (
              <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">{docs.map((d) => <Row key={d.id} item={d} kind="document" />)}</div>
            )}
          </div>
          <div className="flex justify-end pt-1">
            <Button type="button" size="lg" onClick={onClose}>Hotovo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
