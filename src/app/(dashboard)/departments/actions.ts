'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push/webpush'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role || 'employee' }
}

// Členství: management vidí/píše všude; zaměstnanec jen ve svém oddělení.
async function canAccessDept(c: Ctx, departmentId: string): Promise<boolean> {
  if (c.role === 'admin' || c.role === 'manager') return true
  const { data: emp } = await c.admin.from('hr_employees')
    .select('department_id').eq('tenant_id', c.tenantId).eq('user_id', c.userId).maybeSingle()
  return emp?.department_id === departmentId
}

async function deptMembers(c: Ctx, departmentId: string): Promise<string[]> {
  const { data } = await c.admin.from('hr_employees')
    .select('user_id').eq('tenant_id', c.tenantId).eq('department_id', departmentId).eq('status', 'active')
  return (data || []).map((r: any) => r.user_id)
}

// ─── Chat ──────────────────────────────────────────────────────
export async function sendDepartmentMessage(departmentId: string, body: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const text = (body || '').trim()
  if (!text) return { error: 'Napište zprávu.' }
  if (text.length > 4000) return { error: 'Zpráva je příliš dlouhá (max 4000 znaků).' }
  if (!(await canAccessDept(c, departmentId))) return { error: 'Do tohoto oddělení nemáte přístup.' }

  const { error } = await c.admin.from('department_messages').insert({
    tenant_id: c.tenantId, department_id: departmentId, user_id: c.userId, body: text,
  })
  if (error) return { error: error.message }

  // Push členům oddělení (kromě autora) — best-effort.
  try {
    const members = (await deptMembers(c, departmentId)).filter((id) => id !== c.userId)
    if (members.length) {
      const { data: dept } = await c.admin.from('hr_departments').select('name').eq('id', departmentId).maybeSingle()
      await sendPushToUsers(c.admin, members, 'hr', {
        title: `Oddělení ${dept?.name || ''}`.trim(),
        body: text.slice(0, 160),
        url: '/departments',
        tag: `dept-msg-${departmentId}`,
      })
    }
  } catch (e) { console.error('[push] dept message notify failed', e) }

  revalidatePath('/departments'); return {}
}

export async function deleteDepartmentMessage(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  // Autor smaže vlastní zprávu; management jakoukoli.
  let q = c.admin.from('department_messages').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (c.role !== 'admin' && c.role !== 'manager') q = q.eq('user_id', c.userId)
  const { error } = await q
  if (error) return { error: error.message }
  revalidatePath('/departments'); return {}
}

// ─── Úkoly oddělení ────────────────────────────────────────────
export async function createDepartmentTask(departmentId: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const title = (formData.get('title') as string)?.trim()
  if (!title) return { error: 'Zadejte název úkolu.' }
  if (!(await canAccessDept(c, departmentId))) return { error: 'Do tohoto oddělení nemáte přístup.' }

  const assignedTo = (formData.get('assignedTo') as string) || ''
  const dueDate = (formData.get('dueDate') as string) || ''
  const priority = (formData.get('priority') as string) || 'normal'

  const { error } = await c.admin.from('department_tasks').insert({
    tenant_id: c.tenantId, department_id: departmentId, title,
    description: (formData.get('description') as string)?.trim() || null,
    assigned_to: assignedTo && assignedTo !== 'none' ? assignedTo : null,
    due_date: dueDate || null,
    priority: ['low', 'normal', 'high'].includes(priority) ? priority : 'normal',
    created_by: c.userId,
  })
  if (error) return { error: error.message }

  // Push: přiřazenému, jinak celému oddělení.
  try {
    const targets = assignedTo && assignedTo !== 'none'
      ? [assignedTo].filter((id) => id !== c.userId)
      : (await deptMembers(c, departmentId)).filter((id) => id !== c.userId)
    if (targets.length) {
      await sendPushToUsers(c.admin, targets, 'hr', {
        title: 'Nový úkol oddělení',
        body: `${title}${dueDate ? ` • termín ${new Date(dueDate).toLocaleDateString('cs-CZ')}` : ''}`,
        url: '/departments',
        tag: `dept-task-${departmentId}`,
      })
    }
  } catch (e) { console.error('[push] dept task notify failed', e) }

  revalidatePath('/departments'); return {}
}

export async function toggleDepartmentTask(id: string, done: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('department_tasks').update({
    done, done_at: done ? new Date() : null, done_by: done ? c.userId : null,
  }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/departments'); return {}
}

export async function deleteDepartmentTask(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  // Zadavatel smaže vlastní úkol; management jakýkoli.
  let q = c.admin.from('department_tasks').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (c.role !== 'admin' && c.role !== 'manager') q = q.eq('created_by', c.userId)
  const { error } = await q
  if (error) return { error: error.message }
  revalidatePath('/departments'); return {}
}
