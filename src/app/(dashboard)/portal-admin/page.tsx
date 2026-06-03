import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { PortalAdminClient } from './portal-admin-client'
import { PortalMessagesAdmin } from './portal-messages-admin'

export default async function PortalAdminPage() {
  const { supabase, tenantId } = await requireModuleAccess('portal-admin')
  if (!tenantId) return <NoTenantView />

  const [{ data: access }, { data: clients }, { data: events }, { data: documents }, { data: eventAccess }, { data: docAccess }] = await Promise.all([
    supabase.from('portal_access').select('user_id, client_id, display_name, created_at').eq('tenant_id', tenantId),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('events').select('id, name, event_date').eq('tenant_id', tenantId).order('event_date', { ascending: false }).limit(200),
    supabase.from('documents').select('id, name').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200),
    supabase.from('portal_event_access').select('user_id, event_id').eq('tenant_id', tenantId),
    supabase.from('portal_document_access').select('user_id, document_id').eq('tenant_id', tenantId),
  ])

  const uids = (access ?? []).map((a: any) => a.user_id)
  const { data: profiles } = uids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', uids) : { data: [] as any[] }

  const users = (access ?? []).map((a: any) => {
    const p = (profiles ?? []).find((x: any) => x.id === a.user_id)
    return {
      user_id: a.user_id,
      username: p?.username ?? null,
      display_name: a.display_name || p?.full_name || p?.username || '—',
      client_id: a.client_id,
      client_name: (clients ?? []).find((c: any) => c.id === a.client_id)?.name ?? null,
      eventIds: (eventAccess ?? []).filter((e: any) => e.user_id === a.user_id).map((e: any) => e.event_id),
      docIds: (docAccess ?? []).filter((d: any) => d.user_id === a.user_id).map((d: any) => d.document_id),
    }
  })

  const { data: msgs } = await supabase.from('portal_messages').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100)
  const messages = (msgs ?? []).map((m: any) => {
    const a = (access ?? []).find((x: any) => x.user_id === m.user_id)
    const p = (profiles ?? []).find((x: any) => x.id === m.user_id)
    return { id: m.id, sender: a?.display_name || p?.username || '—', subject: m.subject, body: m.body, status: m.status, created_at: m.created_at }
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Klientský portál" description="Pozvi klienty/promotéry a nastav, co uvidí — své akce, faktury a sdílené dokumenty." />
      <PortalAdminClient users={users} clients={clients ?? []} events={events ?? []} documents={documents ?? []} />
      <PortalMessagesAdmin messages={messages} />
    </div>
  )
}
