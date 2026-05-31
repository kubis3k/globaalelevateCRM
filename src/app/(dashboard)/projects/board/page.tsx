import { requireModuleAccess } from '@/lib/supabase/tenant'
import { ProjectsBoard } from './projects-board'

export default async function ProjectsBoardPage() {
  const { supabase, tenantId } = await requireModuleAccess('projects')
  if (!tenantId) return null

  const [{ data: projects }, { data: clients }, { data: tenantUsers }] = await Promise.all([
    supabase.from('projects').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
  ])

  const projectIds = (projects ?? []).map((p: any) => p.id)
  const { data: tasks } = projectIds.length
    ? await supabase.from('project_tasks').select('project_id, status').in('project_id', projectIds)
    : { data: [] as any[] }

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const ownerName = (id: string | null) => { if (!id) return null; const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || null }
  const clientName = (id: string | null) => (clients ?? []).find((c: any) => c.id === id)?.name || null

  const projectsFull = (projects ?? []).map((p: any) => {
    const pts = (tasks ?? []).filter((t: any) => t.project_id === p.id)
    const done = pts.filter((t: any) => t.status === 'done').length
    return { ...p, client_name: clientName(p.client_id), owner_name: ownerName(p.owner_id), tasks_total: pts.length, tasks_done: done }
  })
  const people = ids.map((id: string) => ({ user_id: id, name: ownerName(id) as string }))

  return <ProjectsBoard projects={projectsFull} clients={clients ?? []} people={people} />
}
