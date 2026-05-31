import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { CalendarView } from '@/components/calendar-view'

export default async function CalendarPage() {
  const { supabase, user, tenantId, role, customRoleId } = await requireModuleAccess('calendar')

  if (!tenantId) return <NoTenantView />

  // Profily načítáme zvlášť – mezi tenant_users a profiles není FK, takže
  // PostgREST embed `profiles(...)` zde nefunguje.
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select('user_id')
    .eq('tenant_id', tenantId)

  const memberIds = (tenantUsers ?? []).map((m: any) => m.user_id)
  const { data: profiles } = memberIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', memberIds)
    : { data: [] as any[] }
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  const teamMembers = (tenantUsers ?? []).map((m: any) => ({
    user_id: m.user_id,
    profiles: profileById.get(m.user_id) ?? null,
  }))

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: true })

  // Company (custom) roles — the actual roles to assign events to.
  const { data: roles } = await supabase
    .from('custom_roles')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  return (
    <CalendarView
      initialEvents={events || []}
      teamMembers={teamMembers}
      companyRoles={roles || []}
      currentUserId={user.id}
      currentUserRole={role || 'employee'}
      currentUserCustomRoleId={customRoleId || null}
      tenantId={tenantId}
    />
  )
}
