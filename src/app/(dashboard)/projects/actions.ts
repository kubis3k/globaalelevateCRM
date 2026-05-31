'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push/webpush'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }

function projectRow(fd: FormData) {
  const budget = str(fd, 'budget')
  return {
    name: str(fd, 'name'),
    description: str(fd, 'description'),
    client_id: opt(fd, 'clientId'),
    status: str(fd, 'status') || 'planning',
    priority: str(fd, 'priority') || 'medium',
    owner_id: opt(fd, 'ownerId'),
    start_date: str(fd, 'startDate'),
    due_date: str(fd, 'dueDate'),
    budget: budget ? Number(budget) : null,
    currency: str(fd, 'currency') || 'CZK',
    note: str(fd, 'note'),
  }
}

// ─── Projects ──────────────────────────────────────────────────
export async function createProject(formData: FormData): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = projectRow(formData); if (!row.name) return { error: 'Zadejte název projektu.' }
  const { data, error } = await c.admin.from('projects').insert({ tenant_id: c.tenantId, created_by: c.userId, ...row }).select('id').maybeSingle()
  if (error) return { error: error.message }
  revalidatePath('/projects/board'); revalidatePath('/projects'); return { id: data?.id }
}

export async function updateProject(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = projectRow(formData); if (!row.name) return { error: 'Zadejte název projektu.' }
  const { error } = await c.admin.from('projects').update(row).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/projects/board'); revalidatePath(`/projects/${id}`); revalidatePath('/projects'); return {}
}

export async function setProjectStatus(id: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('projects').update({ status }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/projects/board'); revalidatePath(`/projects/${id}`); revalidatePath('/projects'); return {}
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('projects').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/projects/board'); revalidatePath('/projects'); return {}
}

// ─── Tasks ─────────────────────────────────────────────────────
export async function createTask(projectId: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název úkolu.' }
  const assigneeId = opt(formData, 'assigneeId')
  const dueDate = str(formData, 'dueDate')
  const { error } = await c.admin.from('project_tasks').insert({
    tenant_id: c.tenantId, project_id: projectId, title,
    description: str(formData, 'description'),
    status: str(formData, 'status') || 'todo',
    priority: str(formData, 'priority') || 'medium',
    assignee_id: assigneeId, due_date: dueDate, created_by: c.userId,
  })
  if (error) return { error: error.message }
  // Notify the assignee (best-effort) when it's someone other than the creator.
  try {
    if (assigneeId && assigneeId !== c.userId) {
      const { data: project } = await c.admin.from('projects').select('name').eq('id', projectId).eq('tenant_id', c.tenantId).maybeSingle()
      await sendPushToUsers(c.admin, [assigneeId], 'projects', {
        title: 'Nový úkol v projektu',
        body: `${title}${project?.name ? ` • ${project.name}` : ''}${dueDate ? ` • termín ${new Date(dueDate).toLocaleDateString('cs-CZ')}` : ''}`,
        url: `/projects/${projectId}`,
      })
    }
  } catch (e) { console.error('[push] project task notify failed', e) }
  revalidatePath(`/projects/${projectId}`); revalidatePath('/projects/board'); revalidatePath('/projects'); return {}
}

export async function setTaskStatus(id: string, projectId: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('project_tasks')
    .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`); revalidatePath('/projects/board'); revalidatePath('/projects'); return {}
}

export async function deleteTask(id: string, projectId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('project_tasks').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`); revalidatePath('/projects/board'); revalidatePath('/projects'); return {}
}
