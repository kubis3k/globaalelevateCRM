'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Mail, Plus, Inbox, Send, FileText, Trash2, Archive, AlertCircle, Paperclip, Loader2, RefreshCw,
  Reply, Forward, MailOpen, PenSquare, FolderInput,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { connectAccount, deleteAccount, listMailFolders, listMailMessages, getMailMessage, sendMessage, markRead, deleteMessage, saveAttachmentToDocuments } from './actions'

type Compose = { to: string; cc: string; subject: string; body: string; inReplyTo?: string; references?: string }

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

type Account = { id: string; email: string; name: string; shared: boolean }

const FOLDER_ICON: Record<string, any> = {
  '\\Inbox': Inbox, '\\Sent': Send, '\\Drafts': FileText, '\\Trash': Trash2, '\\Junk': AlertCircle, '\\Archive': Archive,
}
const FOLDER_LABEL: Record<string, string> = {
  '\\Inbox': 'Doručené', '\\Sent': 'Odeslané', '\\Drafts': 'Koncepty', '\\Trash': 'Koš', '\\Junk': 'Spam', '\\Archive': 'Archiv',
}
const fmtDate = (s: string) => {
  const d = new Date(s)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay ? d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

export function MailClient({ accounts, canManageShared }: { accounts: Account[]; canManageShared: boolean }) {
  const [showConnect, setShowConnect] = useState(false)
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [folders, setFolders] = useState<any[]>([])
  const [folder, setFolder] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [openMsg, setOpenMsg] = useState<any>(null)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [compose, setCompose] = useState<Compose | null>(null)
  const [savingAtt, setSavingAtt] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  // Load folders when the account changes.
  useEffect(() => {
    if (!accountId) return
    setLoadingFolders(true); setFolders([]); setMessages([]); setOpenMsg(null); setFolder('')
    listMailFolders(accountId).then((res) => {
      setLoadingFolders(false)
      if (res.error) { toast.error('Chyba schránky', res.error); return }
      const fs = res.folders || []
      setFolders(fs)
      const inbox = fs.find((f: any) => f.special === '\\Inbox') || fs.find((f: any) => f.path.toUpperCase() === 'INBOX') || fs[0]
      if (inbox) setFolder(inbox.path)
    })
  }, [accountId])

  // Load messages when the folder changes.
  useEffect(() => {
    if (!accountId || !folder) return
    setLoadingList(true); setMessages([]); setOpenMsg(null)
    listMailMessages(accountId, folder).then((res) => {
      setLoadingList(false)
      if (res.error) { toast.error('Chyba', res.error); return }
      setMessages(res.messages || [])
    })
  }, [accountId, folder])

  function openMessage(uid: number) {
    setLoadingMsg(true); setOpenMsg(null)
    getMailMessage(accountId, folder, uid).then((res) => {
      setLoadingMsg(false)
      if (res.error) { toast.error('Chyba', res.error); return }
      setOpenMsg(res.message)
      setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)))
    })
  }

  function quoted(m: any) {
    return `\n\n----- Původní zpráva -----\nOd: ${m.from}\nPředmět: ${m.subject}\n\n${m.text || ''}`
  }
  function startReply() {
    if (!openMsg) return
    const refs = Array.isArray(openMsg.references) ? openMsg.references.join(' ') : (openMsg.references || '')
    setCompose({
      to: openMsg.from || '', cc: '',
      subject: /^re:/i.test(openMsg.subject) ? openMsg.subject : `Re: ${openMsg.subject}`,
      body: quoted(openMsg),
      inReplyTo: openMsg.messageId || undefined,
      references: `${refs} ${openMsg.messageId || ''}`.trim() || undefined,
    })
  }
  function startForward() {
    if (!openMsg) return
    setCompose({ to: '', cc: '', subject: /^fwd:/i.test(openMsg.subject) ? openMsg.subject : `Fwd: ${openMsg.subject}`, body: quoted(openMsg) })
  }
  function markUnread() {
    if (!openMsg) return
    startTransition(async () => {
      const res = await markRead(accountId, folder, openMsg.uid, false)
      if (res?.error) { toast.error('Chyba', res.error); return }
      setMessages((prev) => prev.map((m) => (m.uid === openMsg.uid ? { ...m, seen: false } : m)))
      toast.success('Označeno jako nepřečtené')
    })
  }
  async function deleteOpen() {
    if (!openMsg) return
    const ok = await confirmDialog({ title: 'Smazat zprávu?', description: 'Přesune se do koše.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteMessage(accountId, folder, openMsg.uid)
      if (res?.error) { toast.error('Chyba', res.error); return }
      const uid = openMsg.uid
      setMessages((prev) => prev.filter((m) => m.uid !== uid))
      setOpenMsg(null)
      toast.success('Přesunuto do koše')
    })
  }

  function saveAttachment(i: number) {
    if (!openMsg) return
    setSavingAtt(i)
    const note = `${openMsg.from || ''} — ${openMsg.subject || ''}`.trim()
    saveAttachmentToDocuments(accountId, folder, openMsg.uid, i, { note }).then((res) => {
      setSavingAtt(null)
      if (res?.error) { toast.error('Nepodařilo se uložit', res.error); return }
      toast.success('Uloženo do Dokumentů', res.name)
    })
  }

  function refresh() {
    if (folder) setFolder((f) => f) // no-op; re-trigger below
    if (accountId && folder) {
      setLoadingList(true)
      listMailMessages(accountId, folder).then((res) => {
        setLoadingList(false)
        if (!res.error) setMessages(res.messages || [])
      })
    }
  }

  async function removeAccount(a: Account) {
    const ok = await confirmDialog({ title: `Odpojit schránku ${a.email}?`, description: 'Přístupové údaje budou odstraněny. E-maily na serveru zůstanou.', confirmLabel: 'Odpojit', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteAccount(a.id)
      if (res?.error) toast.error('Chyba', res.error)
      else { toast.success('Schránka odpojena'); window.location.reload() }
    })
  }

  if (accounts.length === 0) {
    return (
      <>
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <EmptyState
            icon={Mail}
            title="Žádná připojená schránka"
            description="Připojte firemní e-mail (Zoho) přes IMAP/SMTP — stačí e-mail a app password."
            action={<Button size="lg" onClick={() => setShowConnect(true)}><Plus className="size-4" />Připojit schránku</Button>}
          />
        </div>
        {showConnect && <ConnectDialog canManageShared={canManageShared} onClose={() => setShowConnect(false)} />}
      </>
    )
  }

  const current = accounts.find((a) => a.id === accountId)

  return (
    <div className="space-y-3">
      {/* Account switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <select className={cn(selectClass, 'w-auto')} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.shared ? ' (firemní)' : ''} · {a.email}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loadingList}><RefreshCw className={cn('size-4', loadingList && 'animate-spin')} />Obnovit</Button>
        {current && (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeAccount(current)}>Odpojit</Button>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setCompose({ to: '', cc: '', subject: '', body: '' })}><PenSquare className="size-4" />Napsat</Button>
        <Button variant="outline" size="sm" onClick={() => setShowConnect(true)}><Plus className="size-4" />Připojit další</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[180px_320px_1fr]">
        {/* Folders */}
        <div className="rounded-xl border border-border bg-card p-2 shadow-xs">
          {loadingFolders ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
          ) : (
            <nav className="flex flex-col gap-0.5">
              {folders.map((f) => {
                const Icon = FOLDER_ICON[f.special] || Mail
                const label = FOLDER_LABEL[f.special] || f.name
                const active = f.path === folder
                return (
                  <button key={f.path} onClick={() => setFolder(f.path)}
                    className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                      active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                    <Icon className="size-4 shrink-0" /><span className="truncate">{label}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* Message list */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {loadingList ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <EmptyState icon={Inbox} title="Prázdná složka" />
          ) : (
            <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {messages.map((m) => (
                <button key={m.uid} onClick={() => openMessage(m.uid)}
                  className={cn('block w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60', openMsg?.uid === m.uid && 'bg-muted', !m.seen && 'border-l-2 border-primary')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('truncate text-sm', m.seen ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{m.from || m.fromAddress || '—'}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{fmtDate(m.date)}</span>
                  </div>
                  <div className={cn('truncate text-sm', m.seen ? 'text-muted-foreground' : 'text-foreground')}>{m.subject}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reading pane */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {loadingMsg ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : !openMsg ? (
            <EmptyState icon={Mail} title="Vyberte zprávu" description="Klikněte na e-mail v seznamu." />
          ) : (
            <div className="flex h-full max-h-[70vh] flex-col">
              <div className="border-b border-border p-4">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={startReply}><Reply className="size-3.5" />Odpovědět</Button>
                  <Button variant="outline" size="sm" onClick={startForward}><Forward className="size-3.5" />Přeposlat</Button>
                  <Button variant="ghost" size="sm" onClick={markUnread}><MailOpen className="size-3.5" />Nepřečtené</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={deleteOpen}><Trash2 className="size-3.5" />Smazat</Button>
                </div>
                <h3 className="text-base font-semibold text-foreground">{openMsg.subject}</h3>
                <div className="mt-1 text-sm text-muted-foreground">Od: {openMsg.from}</div>
                <div className="text-xs text-muted-foreground">Komu: {openMsg.to} · {new Date(openMsg.date).toLocaleString('cs-CZ')}</div>
                {openMsg.attachments?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {openMsg.attachments.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-sm">
                        <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-foreground">{a.filename}</span>
                        <Button variant="ghost" size="sm" className="ml-auto shrink-0" disabled={savingAtt === i} onClick={() => saveAttachment(i)}>
                          {savingAtt === i ? <Loader2 className="size-3.5 animate-spin" /> : <FolderInput className="size-3.5" />}
                          Do dokumentů
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                {openMsg.html ? (
                  <iframe title="E-mail" sandbox="" className="h-full min-h-[300px] w-full bg-white" srcDoc={openMsg.html} />
                ) : (
                  <pre className="whitespace-pre-wrap p-4 text-sm text-foreground">{openMsg.text || '(prázdná zpráva)'}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showConnect && <ConnectDialog canManageShared={canManageShared} onClose={() => setShowConnect(false)} />}
      {compose && <ComposeDialog accountId={accountId} initial={compose} onClose={() => setCompose(null)} onSent={refresh} />}
    </div>
  )
}

function ComposeDialog({ accountId, initial, onClose, onSent }: { accountId: string; initial: Compose; onClose: () => void; onSent: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(initial)
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await sendMessage(accountId, { to: form.to, cc: form.cc, subject: form.subject, body: form.body, inReplyTo: initial.inReplyTo, references: initial.references })
      if (res?.error) { toast.error('Odeslání selhalo', res.error); return }
      toast.success('Odesláno')
      onClose()
      onSent()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Nová zpráva</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Komu</Label><Input value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} required placeholder="prijemce@firma.cz" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Kopie (Cc)</Label><Input value={form.cc} onChange={(e) => setForm((f) => ({ ...f, cc: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Předmět</Label><Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Zpráva</Label>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={10}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}><Send className="size-4" />{pending ? 'Odesílám…' : 'Odeslat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConnectDialog({ canManageShared, onClose }: { canManageShared: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [advanced, setAdvanced] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await connectAccount(fd)
      if (res?.error) { toast.error('Nepodařilo se připojit', res.error); return }
      toast.success('Schránka připojena')
      window.location.reload()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Připojit schránku (Zoho)</DialogTitle>
          <DialogDescription>
            Firemní Zoho vyžaduje <strong>app password</strong>: na <strong>accounts.zoho.eu → Security</strong> zapni Two-Factor Authentication, pak <strong>App Passwords → Generate</strong> a vlož vygenerovaný kód místo hesla. IMAP přístup musí být v Zoho povolen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">E-mail</Label><Input name="email" type="email" required placeholder="vy@firma.cz" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Heslo</Label><Input name="password" type="password" required placeholder="Heslo k e-mailu (nebo app password při 2FA)" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název (volitelné)</Label><Input name="displayName" placeholder="Např. Info schránka" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Typ schránky</Label>
            <select name="scope" defaultValue={canManageShared ? 'shared' : 'personal'} className={selectClass}>
              {canManageShared && <option value="shared">Sdílená firemní (vidí oprávnění uživatelé)</option>}
              <option value="personal">Osobní (jen já)</option>
            </select>
          </div>

          <button type="button" onClick={() => setAdvanced((v) => !v)} className="text-xs text-primary hover:underline">
            {advanced ? 'Skrýt' : 'Pokročilé'} nastavení serveru
          </button>
          {advanced && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">IMAP host</Label><Input name="imapHost" defaultValue="imappro.zoho.eu" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">IMAP port</Label><Input name="imapPort" type="number" defaultValue={993} /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">SMTP host</Label><Input name="smtpHost" defaultValue="smtppro.zoho.eu" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">SMTP port</Label><Input name="smtpPort" type="number" defaultValue={465} /></div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Připojuji…' : 'Připojit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
