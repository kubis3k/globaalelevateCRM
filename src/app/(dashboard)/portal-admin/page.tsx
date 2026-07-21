import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { PortalAdminClient } from './portal-admin-client'
import { PortalMessagesAdmin } from './portal-messages-admin'

export default async function PortalAdminPage() {
  const { supabase, tenantId } = await requireModuleAccess('portal-admin')
  if (!tenantId) return <NoTenantView />

  const [{ data: access }, { data: clients }, { data: events }, { data: documents }, { data: overrides }] = await Promise.all([
    supabase.from('portal_access').select('user_id, client_id, display_name, created_at').eq('tenant_id', tenantId),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('events').select('id, name, event_date, client_id').eq('tenant_id', tenantId).not('client_id', 'is', null).order('event_date', { ascending: false }).limit(300),
    supabase.from('documents').select('id, name, client_id').eq('tenant_id', tenantId).not('client_id', 'is', null).order('created_at', { ascending: false }).limit(300),
    supabase.from('portal_visibility_overrides').select('client_id, item_type, item_id').eq('tenant_id', tenantId),
  ])

  const uids = (access ?? []).map((a: any) => a.user_id)
  const { data: profiles } = uids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', uids) : { data: [] as any[] }

  const isHidden = (clientId: string, type: string, itemId: string) =>
    (overrides ?? []).some((o: any) => o.client_id === clientId && o.item_type === type && o.item_id === itemId)

  // Auto-share: co je klientovi navázanému na portálový účet vidět (client_id shoda), s příznakem skrytí.
  const users = (access ?? []).map((a: any) => {
    const p = (profiles ?? []).find((x: any) => x.id === a.user_id)
    const cid = a.client_id
    const clientEvents = cid ? (events ?? []).filter((e: any) => e.client_id === cid).map((e: any) => ({ id: e.id, name: e.name, event_date: e.event_date, hidden: isHidden(cid, 'event', e.id) })) : []
    const clientDocs = cid ? (documents ?? []).filter((d: any) => d.client_id === cid).map((d: any) => ({ id: d.id, name: d.name, hidden: isHidden(cid, 'document', d.id) })) : []
    return {
      user_id: a.user_id,
      username: p?.username ?? null,
      display_name: a.display_name || p?.full_name || p?.username || '—',
      client_id: cid,
      client_name: (clients ?? []).find((c: any) => c.id === cid)?.name ?? null,
      events: clientEvents,
      documents: clientDocs,
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
      <PageHeader title="Klientský portál" description="Pozvi klienty — automaticky uvidí vše navázané na jejich firmu v CRM (akce, dokumenty, smlouvy). Jednotlivou položku můžeš výjimečně skrýt." />
      <PortalAdminClient users={users} clients={clients ?? []} />
      <PortalMessagesAdmin messages={messages} />
    </div>
  )
}
