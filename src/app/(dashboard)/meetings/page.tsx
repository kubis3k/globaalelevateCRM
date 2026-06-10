import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { MeetingsClient } from './meetings-client'

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('meetings')
  if (!tenantId) return <NoTenantView />

  const { data: meetings } = await supabase
    .from('meetings').select('*').eq('tenant_id', tenantId)
    .order('starts_at', { ascending: false })

  const ids = (meetings ?? []).map((m: any) => m.id)
  const { data: items } = ids.length
    ? await supabase.from('meeting_action_items').select('*').in('meeting_id', ids).order('sort').order('created_at')
    : { data: [] as any[] }

  return (
    <div className="space-y-6">
      <PageHeader title="Meetingy" description="Rozvrh porad, zápisy a úkoly z porad." />
      <MeetingsClient
        meetings={meetings ?? []}
        items={items ?? []}
        canManage={role === 'admin' || role === 'manager'}
      />
    </div>
  )
}
