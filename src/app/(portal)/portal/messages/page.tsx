import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { MessageSquare } from 'lucide-react'
import { getPortalScope } from '../scope'
import { MessageCompose } from './message-compose'

const ACT_LABEL: Record<string, string> = { note: 'Poznámka', call: 'Hovor', meeting: 'Schůzka', email: 'E-mail', task: 'Úkol' }

// Komunikace = vlastní odeslané zprávy (portal_messages) + interní CRM
// aktivity, které staff označil "Zobrazit klientovi" — jeden sloučený feed.
export default async function PortalMessagesPage() {
  const { supabase, tenantId, user, clientId } = await getPortalScope()

  const [{ data: messages }, { data: activities }] = await Promise.all([
    supabase.from('portal_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    clientId
      ? supabase.from('crm_activities').select('*').eq('tenant_id', tenantId).eq('client_id', clientId).eq('visible_to_client', true).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ])

  const feed = [
    ...(messages ?? []).map((m: any) => ({ kind: 'message' as const, at: m.created_at, data: m })),
    ...(activities ?? []).map((a: any) => ({ kind: 'activity' as const, at: a.created_at, data: a })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1))

  return (
    <div className="space-y-6">
      <PageHeader title="Komunikace" description="Napište nám — dotazy, požadavky k akci, změny. Ozveme se vám." />
      <MessageCompose />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Historie</h2>
        {feed.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Zatím žádná komunikace" description="Vaše odeslané zprávy a informace od nás se zobrazí zde." />
        ) : (
          <div className="space-y-2">
            {feed.map((f) =>
              f.kind === 'message' ? (
                <div key={`m-${f.data.id}`} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{f.data.subject || 'Zpráva'}</span>
                    <Badge variant={f.data.status === 'resolved' ? 'success' : 'info'}>{f.data.status === 'resolved' ? 'Vyřízeno' : 'Odesláno'}</Badge>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{f.data.body}</p>
                  <div className="mt-1.5 text-xs text-muted-foreground">{f.data.created_at ? new Date(f.data.created_at).toLocaleString('cs-CZ') : ''}</div>
                </div>
              ) : (
                <div key={`a-${f.data.id}`} className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{f.data.subject}</span>
                    <Badge variant="secondary">{ACT_LABEL[f.data.type] ?? 'Info'}</Badge>
                  </div>
                  {f.data.content && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{f.data.content}</p>}
                  <div className="mt-1.5 text-xs text-muted-foreground">{new Date(f.data.created_at).toLocaleString('cs-CZ')} · od nás</div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
