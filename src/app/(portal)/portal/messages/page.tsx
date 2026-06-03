import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { MessageSquare } from 'lucide-react'
import { getPortalScope } from '../scope'
import { MessageCompose } from './message-compose'

export default async function PortalMessagesPage() {
  const { supabase, user } = await getPortalScope()
  const { data: messages } = await supabase.from('portal_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  const list = messages ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Zprávy" description="Napište nám — dotazy, požadavky k akci, změny. Ozveme se vám." />
      <MessageCompose />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Odeslané zprávy</h2>
        {list.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Zatím žádné zprávy" description="Vaše odeslané zprávy se zobrazí zde." />
        ) : (
          <div className="space-y-2">
            {list.map((m: any) => (
              <div key={m.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{m.subject || 'Zpráva'}</span>
                  <Badge variant={m.status === 'resolved' ? 'success' : 'info'}>{m.status === 'resolved' ? 'Vyřízeno' : 'Odesláno'}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{m.body}</p>
                <div className="mt-1.5 text-xs text-muted-foreground">{m.created_at ? new Date(m.created_at).toLocaleString('cs-CZ') : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
