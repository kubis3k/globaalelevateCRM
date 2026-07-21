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

export type PortalItemType = 'event' | 'document' | 'contract' | 'deliverable'

/**
 * Auto-share model: everything with `client_id` matching the logged-in
 * client is visible by default. `portal_visibility_overrides` lets an admin
 * hide an individual item as the rare exception. Same scope + the resolved
 * `crm_clients` row (name/ico used for e.g. accounting-invoice matching).
 */
export async function getPortalClientContext() {
  const scope = await getPortalScope()
  if (!scope.clientId) return { ...scope, client: null as { id: string; name: string; ico: string | null; email: string | null } | null }
  const { data: client } = await scope.supabase
    .from('crm_clients')
    .select('id, name, ico, email')
    .eq('tenant_id', scope.tenantId)
    .eq('id', scope.clientId)
    .maybeSingle()
  return { ...scope, client }
}

/** Item ids an admin explicitly hid from this client's portal, by type. */
export async function getHiddenIds(admin: any, clientId: string, itemType: PortalItemType): Promise<Set<string>> {
  const { data } = await admin.from('portal_visibility_overrides').select('item_id').eq('client_id', clientId).eq('item_type', itemType)
  return new Set((data ?? []).map((r: any) => r.item_id as string))
}
