import { requireModuleAccess } from '@/lib/supabase/tenant'
import { TimeEntriesClient } from './entries-client'

export default async function TimeEntriesPage() {
  const { supabase, tenantId, role, user } = await requireModuleAccess('time')
  if (!tenantId) return null

  const [{ data: entries }, { data: projects }, { data: tenantUsers }] = await Promise.all([
    supabase.from('time_entries').select('*').eq('tenant_id', tenantId).order('work_date', { ascending: false }).limit(500),
    supabase.from('projects').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (uid: string | null) => { if (!uid) return null; const p = (profiles ?? []).find((x: any) => x.id === uid); return p?.full_name || p?.username || null }
  const projName = (id: string | null) => (projects ?? []).find((p: any) => p.id === id)?.name || null

  const entriesFull = (entries ?? []).map((e: any) => ({ ...e, project_name: projName(e.project_id), person_name: nameOf(e.user_id) }))
  const canManageAll = role === 'admin' || role === 'manager'

  return <TimeEntriesClient entries={entriesFull} projects={projects ?? []} currentUserId={user.id} canManageAll={canManageAll} />
}
