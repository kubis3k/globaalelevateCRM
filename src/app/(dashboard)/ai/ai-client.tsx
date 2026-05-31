'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, Plus, Send, Loader2, Trash2, Pencil, Users, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { createConversation, getMessages, renameConversation, setShared, deleteConversation } from './actions'

type Convo = { id: string; title: string; shared: boolean; canManage: boolean }
type Msg = { role: 'user' | 'assistant'; content: string }

const EXAMPLES = [
  'Shrň, co víš o naší firmě a jejích modulech.',
  'Které faktury jsou ještě nezaplacené?',
  'Najdi mi aktuální informace o našem největším klientovi na webu.',
  'Jaké úkoly a události mě čekají tento týden?',
]

export function AiClient({ conversations }: { conversations: Convo[] }) {
  const [convos, setConvos] = useState<Convo[]>(conversations)
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const active = convos.find((c) => c.id === activeId) || null

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    setLoadingMsgs(true)
    getMessages(activeId).then((res) => {
      setLoadingMsgs(false)
      if (res.error) { toast.error('Chyba', res.error); return }
      setMessages((res.messages as Msg[]) || [])
    })
  }, [activeId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  async function newChat(shared: boolean) {
    const res = await createConversation(shared)
    if (res.error || !res.id) { toast.error('Chyba', res.error || 'Nepodařilo se vytvořit chat.'); return }
    const c: Convo = { id: res.id, title: 'Nový chat', shared, canManage: true }
    setConvos((p) => [c, ...p])
    setActiveId(res.id)
    setMessages([])
  }

  async function remove(c: Convo) {
    const ok = await confirmDialog({ title: `Smazat „${c.title}"?`, description: 'Konverzace bude trvale odstraněna.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    const res = await deleteConversation(c.id)
    if (res.error) { toast.error('Chyba', res.error); return }
    setConvos((p) => p.filter((x) => x.id !== c.id))
    if (activeId === c.id) { setActiveId(null); setMessages([]) }
    toast.success('Smazáno')
  }

  async function toggleShared(c: Convo) {
    const res = await setShared(c.id, !c.shared)
    if (res.error) { toast.error('Chyba', res.error); return }
    setConvos((p) => p.map((x) => (x.id === c.id ? { ...x, shared: !x.shared } : x)))
    toast.success(!c.shared ? 'Nastaveno jako sdílené' : 'Nastaveno jako soukromé')
  }

  function startRename(c: Convo) { setEditingId(c.id); setEditTitle(c.title) }
  async function saveRename(c: Convo) {
    const t = editTitle.trim()
    setEditingId(null)
    if (!t || t === c.title) return
    const res = await renameConversation(c.id, t)
    if (res.error) { toast.error('Chyba', res.error); return }
    setConvos((p) => p.map((x) => (x.id === c.id ? { ...x, title: t } : x)))
  }

  async function send(text?: string) {
    const message = (text ?? input).trim()
    if (!message || streaming) return

    let convoId = activeId
    if (!convoId) {
      const res = await createConversation(false)
      if (res.error || !res.id) { toast.error('Chyba', res.error || 'Nepodařilo se vytvořit chat.'); return }
      convoId = res.id
      setConvos((p) => [{ id: res.id!, title: 'Nový chat', shared: false, canManage: true }, ...p])
      setActiveId(res.id)
    }

    setInput('')
    setMessages((p) => [...p, { role: 'user', content: message }, { role: 'assistant', content: '' }])
    setStreaming(true)

    // Title the conversation locally from the first message.
    setConvos((p) => p.map((x) => (x.id === convoId && (x.title === 'Nový chat') ? { ...x, title: message.slice(0, 60) } : x)))

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convoId, message }),
      })
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '')
        const errText = t || `Chyba ${res.status}`
        setMessages((p) => { const n = [...p]; n[n.length - 1] = { role: 'assistant', content: `⚠️ ${errText}` }; return n })
        setStreaming(false)
        return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value, { stream: true })
        setMessages((p) => { const n = [...p]; n[n.length - 1] = { role: 'assistant', content: n[n.length - 1].content + chunk }; return n })
      }
    } catch (e: any) {
      setMessages((p) => { const n = [...p]; n[n.length - 1] = { role: 'assistant', content: `⚠️ ${e?.message || 'Spojení selhalo.'}` }; return n })
    } finally {
      setStreaming(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const lastIsEmptyAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === ''

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] gap-4">
      {/* Conversation sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-xl border border-border bg-card lg:flex">
        <div className="border-b border-border p-2">
          <Button className="w-full" size="lg" onClick={() => newChat(false)}><Plus className="size-4" />Nový chat</Button>
          <button onClick={() => newChat(true)} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Users className="size-3.5" />Nový sdílený chat
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {convos.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">Zatím žádné konverzace.</p>
          ) : convos.map((c) => (
            <div key={c.id} className={cn('group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors', activeId === c.id ? 'bg-muted' : 'hover:bg-muted/60')}>
              {editingId === c.id ? (
                <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveRename(c)} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(c); if (e.key === 'Escape') setEditingId(null) }}
                  className="h-6 w-full rounded border border-input bg-background px-1.5 text-sm outline-none" />
              ) : (
                <>
                  <button onClick={() => setActiveId(c.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                    {c.shared && <Users className="size-3 shrink-0 text-muted-foreground" />}
                    <span className={cn('truncate', activeId === c.id ? 'font-medium text-foreground' : 'text-muted-foreground')}>{c.title}</span>
                  </button>
                  {c.canManage && (
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => toggleShared(c)} title={c.shared ? 'Změnit na soukromé' : 'Sdílet s týmem'} className="rounded p-1 text-muted-foreground hover:text-foreground"><Users className="size-3.5" /></button>
                      <button onClick={() => startRename(c)} title="Přejmenovat" className="rounded p-1 text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></button>
                      <button onClick={() => remove(c)} title="Smazat" className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main thread */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-card">
        {/* Mobile conversation switcher */}
        <div className="flex items-center gap-2 border-b border-border p-2 lg:hidden">
          <select value={activeId ?? ''} onChange={(e) => setActiveId(e.target.value || null)} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm outline-none">
            <option value="">— vyber konverzaci —</option>
            {convos.map((c) => <option key={c.id} value={c.id}>{c.shared ? '👥 ' : ''}{c.title}</option>)}
          </select>
          <Button size="icon" variant="outline" onClick={() => newChat(false)} aria-label="Nový chat"><Plus className="size-4" /></Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {loadingMsgs ? (
            <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-6" /></div>
              <h2 className="text-lg font-semibold text-foreground">Globaal AI</h2>
              <p className="mt-1 mb-5 text-sm text-muted-foreground">Tvůj firemní asistent — zná firmu a umí research na webu.</p>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => send(ex)} className="rounded-xl border border-border bg-background p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="mr-2 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="size-4" /></div>
                  )}
                  <div className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                    {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : '')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Napiš zprávu… (Enter odešle, Shift+Enter nový řádek)"
              className="max-h-40 min-h-[44px] flex-1 resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button size="icon-lg" disabled={streaming || !input.trim()} onClick={() => send()} aria-label="Odeslat">
              {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
          <p className="mx-auto mt-1.5 flex max-w-3xl items-center gap-1 text-[11px] text-muted-foreground">
            <Globe className="size-3" /> Umí vyhledávat na webu a číst firemní data (dle tvých oprávnění).
          </p>
        </div>
      </div>
    </div>
  )
}
