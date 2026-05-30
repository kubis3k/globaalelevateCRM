import { redirect } from 'next/navigation'
import { createClient } from './server'

export async function requireTenant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Získání aktuální tenant_id a role
  const { data: currentUserData, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !currentUserData) {
    return {
      supabase,
      user,
      tenantId: null,
      role: null,
    }
  }

  return {
    supabase,
    user,
    tenantId: currentUserData.tenant_id,
    role: currentUserData.role,
  }
}
