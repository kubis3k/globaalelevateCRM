// Shared-calendar events that are assigned to the current user (directly via
// assigned_to, or to their role via assigned_role). Surfaced read-only inside
// the personal sector so each person sees what's assigned to them alongside
// their private items. Plain async helper for server components.
export async function getAssignedEvents(
  supabase: any,
  tenantId: string,
  userId: string,
  role: string | null,
  sinceISO: string,
) {
  let q = supabase
    .from('calendar_events')
    .select('id, title, description, start_time, end_time, assigned_to, assigned_role')
    .eq('tenant_id', tenantId)
    .gte('start_time', sinceISO)
  q = role ? q.or(`assigned_to.eq.${userId},assigned_role.eq.${role}`) : q.eq('assigned_to', userId)
  const { data } = await q.order('start_time', { ascending: true })
  return (data ?? []) as { id: string; title: string; description: string | null; start_time: string; end_time: string }[]
}
