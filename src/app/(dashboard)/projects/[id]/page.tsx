import { requireModuleAccess } from '@/lib/supabase/tenant'
import { notFound } from 'next/navigation'
import { ProjectDetail } from './project-detail'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId } = await requireModuleAccess('projects')
  if (!tenantId) return null

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!project) notFound()

  const [{ data: tasks }, { data: tenantUsers }, { data: clients }] = await Promise.all([
    supabase.from('project_tasks').select('*').eq('tenant_id', tenantId).eq('project_id', id).order('created_at', { ascending: true }),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (uid: string | null) => { if (!uid) return null; const p = (profiles ?? []).find((x: any) => x.id === uid); return p?.full_name || p?.username || null }
  const people = ids.map((uid: string) => ({ user_id: uid, name: nameOf(uid) as string }))

  const tasksFull = (tasks ?? []).map((t: any) => ({ ...t, assignee_name: nameOf(t.assignee_id) }))
  const clientName = (clients ?? []).find((c: any) => c.id === project.client_id)?.name ?? null

  return (
    <ProjectDetail
      project={{ ...project, owner_name: nameOf(project.owner_id), client_name: clientName }}
      tasks={tasksFull}
      clients={clients ?? []}
      people={people}
    />
  )
}
