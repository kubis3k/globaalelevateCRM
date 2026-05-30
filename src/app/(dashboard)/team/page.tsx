import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('team')
  if (!tenantId) return <NoTenantView />

  // `supabase` z requireTenant je service-role admin client (obchází RLS).
  const { data: members } = await supabase
    .from('tenant_users')
    .select('user_id, role, custom_role_id, profiles (username, full_name)')
    .eq('tenant_id', tenantId)

  const { data: customRoles } = await supabase
    .from('custom_roles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')

  return (
    <TeamClient
      members={members || []}
      customRoles={(customRoles as any) || []}
      currentUserId={user.id}
      currentUserRole={role || 'employee'}
    />
  )
}
