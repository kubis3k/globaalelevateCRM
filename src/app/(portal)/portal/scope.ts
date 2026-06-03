import 'server-only'
import { requireTenant } from '@/lib/supabase/tenant'

/**
 * Portal scope for the logged-in external user. `supabase` is the service-role
 * admin client (from requireTenant); data is scoped manually via portal_* links.
 */
export async function getPortalScope() {
  const { supabase, user, tenantId, role } = await requireTenant()
  const { data: access } = await supabase
    .from('portal_access')
    .select('user_id, client_id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()
  return { supabase, user, tenantId, role, access, clientId: access?.client_id ?? null }
}
