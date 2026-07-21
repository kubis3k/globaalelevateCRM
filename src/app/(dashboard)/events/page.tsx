import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { canManageEvents } from '@/lib/permissions'
import { EventsClient } from './events-client'

export default async function EventsPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('events')
  if (!tenantId) return <NoTenantView />
  const [{ data }, { data: clients }] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, event_date, start_time, location, capacity, status, budget, client, client_id')
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: false, nullsFirst: false }),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
  ])

  return (
    <div className="space-y-6">
      <PageHeader title="Akce" description="Produkční hub — line-up, run-of-show, obsazení a rozpočet eventů." />
      <EventsClient events={data ?? []} clients={clients ?? []} canManage={canManageEvents(role)} />
    </div>
  )
}
