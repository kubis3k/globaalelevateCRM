import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { CalendarView } from '@/components/calendar-view'

export default async function CalendarPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('calendar')
  
  if (!tenantId) return <NoTenantView />

  const { data: teamMembers } = await supabase
    .from('tenant_users')
    .select(`user_id, profiles (username, full_name)`)
    .eq('tenant_id', tenantId)

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: true })

  return (
    <CalendarView
      initialEvents={events || []}
      teamMembers={teamMembers || []}
      currentUserId={user.id}
      currentUserRole={role || 'employee'}
      tenantId={tenantId}
    />
  )
}
