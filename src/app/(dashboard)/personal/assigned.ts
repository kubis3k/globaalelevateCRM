// Shared-calendar events that are assigned to the current user — directly
// (assigned_to), to their system role (assigned_role), or to their company /
// custom role (assigned_custom_role_id). Surfaced read-only inside the personal
// sector so each person sees what's assigned to them alongside their private
// items. Plain async helper for server components.
export async function getAssignedEvents(
  supabase: any,
  tenantId: string,
  userId: string,
  role: string | null,
  customRoleId: string | null,
  sinceISO: string,
) {
  const terms = [`assigned_to.eq.${userId}`]
  if (role) terms.push(`assigned_role.eq.${role}`)
  if (customRoleId) terms.push(`assigned_custom_role_id.eq.${customRoleId}`)

  const { data } = await supabase
    .from('calendar_events')
    .select('id, title, description, start_time, end_time, assigned_to, assigned_role, assigned_custom_role_id')
    .eq('tenant_id', tenantId)
    .gte('start_time', sinceISO)
    .or(terms.join(','))
    .order('start_time', { ascending: true })

  return (data ?? []) as { id: string; title: string; description: string | null; start_time: string; end_time: string }[]
}
