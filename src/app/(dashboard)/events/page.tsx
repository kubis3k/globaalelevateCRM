import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { canManageEvents } from '@/lib/permissions'
import { EventsClient } from './events-client'

export default async function EventsPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('events')
  if (!tenantId) return <NoTenantView />
  const { data } = await supabase
    .from('events')
    .select('id, name, event_date, start_time, location, capacity, status, budget, client')
    .eq('tenant_id', tenantId)
    .order('event_date', { ascending: false, nullsFirst: false })

  return (
    <div className="space-y-6">
      <PageHeader title="Akce" description="Produkční hub — line-up, run-of-show, obsazení a rozpočet eventů." />
      <EventsClient events={data ?? []} canManage={canManageEvents(role)} />
    </div>
  )
}
