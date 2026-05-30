import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('team')
  if (!tenantId) return <NoTenantView />

  // `supabase` z requireTenant je service-role admin client (obchází RLS).
  // Profily načítáme zvlášť – mezi tenant_users a profiles není FK (obě míří na
  // auth.users), takže PostgREST embed `profiles(...)` zde nefunguje.
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select('user_id, role, custom_role_id')
    .eq('tenant_id', tenantId)

  const userIds = (tenantUsers ?? []).map((m: any) => m.user_id)
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
    : { data: [] as any[] }
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  const members = (tenantUsers ?? []).map((m: any) => ({
    user_id: m.user_id,
    role: m.role,
    custom_role_id: m.custom_role_id,
    profiles: profileById.get(m.user_id) ?? null,
  }))

  const { data: customRoles } = await supabase
    .from('custom_roles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')

  return (
    <TeamClient
      members={members}
      customRoles={(customRoles as any) || []}
      currentUserId={user.id}
      currentUserRole={role || 'employee'}
    />
  )
}
