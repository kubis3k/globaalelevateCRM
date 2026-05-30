import { redirect } from 'next/navigation'
import { createClient } from './server'
import { createAdminClient } from './admin'

export async function requireTenant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  // Získání aktuální tenant_id a role přes admin client (obchází RLS rekurzi)
  const { data: currentUserData, error } = await adminClient
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('requireTenant DB error:', error)
  }

  if (error || !currentUserData) {
    console.warn('requireTenant: no tenant_user found for user', user.id, 'currentUserData:', currentUserData)
    return {
      supabase: adminClient,
      user,
      tenantId: null,
      role: null,
    }
  }

  return {
    supabase: adminClient,
    user,
    tenantId: currentUserData.tenant_id,
    role: currentUserData.role,
  }
}
