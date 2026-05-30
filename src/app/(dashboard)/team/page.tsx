import { requireTenant } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const { supabase, user, tenantId, role } = await requireTenant()
  if (!tenantId) return <NoTenantView />

  const admin = (await import('@/lib/supabase/admin')).createAdminClient()

  const [{ data: members }, { data: customRoles }] = await Promise.all([
    admin.from('tenant_users')
      .select(`user_id, role, custom_role_id, profiles (username, full_name)`)
      .eq('tenant_id', tenantId),
    admin.from('custom_roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name')
      .catch(() => ({ data: [] })),
  ])

  return (
    <TeamClient
      members={members || []}
      customRoles={(customRoles as any) || []}
      currentUserId={user.id}
      currentUserRole={role || 'employee'}
    />
  )
}
