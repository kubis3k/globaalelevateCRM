'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2, MessageSquare, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { resolvePortalMessage, deletePortalMessage } from './actions'

type Msg = { id: string; sender: string; subject: string | null; body: string; status: string; created_at: string }

export function PortalMessagesAdmin({ messages }: { messages: Msg[] }) {
  const router = useRouter()
  const [isPending, start] = useTransition()

  function resolve(m: Msg) {
    start(async () => { const r = await resolvePortalMessage(m.id, m.status !== 'resolved'); if (r?.error) toast.error('Chyba', r.error); else router.refresh() })
  }
  async function remove(m: Msg) {
    const ok = await confirmDialog({ title: 'Smazat zprávu?', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deletePortalMessage(m.id); if (r?.error) toast.error('Chyba', r.error); else { toast.success('Smazáno'); router.refresh() } })
  }

  const open = messages.filter((m) => m.status !== 'resolved').length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Zprávy od klientů</h3>
        {open > 0 && <Badge variant="info">{open} nových</Badge>}
      </div>
      {messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Žádné zprávy" description="Zprávy od klientů z portálu se zobrazí zde." />
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{m.subject || 'Zpráva'} <span className="text-xs font-normal text-muted-foreground">· {m.sender}</span></span>
                <Badge variant={m.status === 'resolved' ? 'success' : 'info'}>{m.status === 'resolved' ? 'Vyřízeno' : 'Nové'}</Badge>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{m.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleString('cs-CZ') : ''}</span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" disabled={isPending} onClick={() => resolve(m)}>
                    {m.status === 'resolved' ? <><RotateCcw className="size-3.5" />Znovu otevřít</> : <><Check className="size-3.5" />Vyřízeno</>}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(m)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
