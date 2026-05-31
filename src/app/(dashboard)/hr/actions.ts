'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageHr } from '@/lib/permissions'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role as string }
}

const str = (fd: FormData, k: string) => {
  const v = (fd.get(k) as string)?.trim()
  return v ? v : null
}
const opt = (fd: FormData, k: string) => {
  const v = str(fd, k)
  return v && v !== 'none' ? v : null
}

// ─── Departments ───────────────────────────────────────────────
export async function createDepartment(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const name = str(formData, 'name'); if (!name) return { error: 'Zadejte název oddělení.' }
  const { error } = await c.admin.from('hr_departments').insert({ tenant_id: c.tenantId, name })
  if (error) return { error: error.code === '23505' ? 'Oddělení s tímto názvem už existuje.' : error.message }
  revalidatePath('/hr/employees'); return {}
}

export async function deleteDepartment(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_departments').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/employees'); return {}
}

// ─── Employees ─────────────────────────────────────────────────
function employeeRow(fd: FormData, isAdmin: boolean) {
  const row: Record<string, unknown> = {
    position: str(fd, 'position'),
    department_id: opt(fd, 'departmentId'),
    employment_type: str(fd, 'employmentType') || 'full_time',
    start_date: str(fd, 'startDate'),
    end_date: str(fd, 'endDate'),
    phone: str(fd, 'phone'),
    personal_email: str(fd, 'personalEmail'),
    address: str(fd, 'address'),
    manager_id: opt(fd, 'managerId'),
    annual_leave_days: Number(str(fd, 'annualLeaveDays') || 20),
    status: str(fd, 'status') || 'active',
    notes: str(fd, 'notes'),
  }
  if (isAdmin) {
    const salary = str(fd, 'salary')
    row.salary = salary ? Number(salary) : null
    row.salary_currency = str(fd, 'salaryCurrency') || 'CZK'
  }
  return row
}

export async function createEmployee(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const userId = opt(formData, 'userId'); if (!userId) return { error: 'Vyberte zaměstnance.' }
  const { error } = await c.admin.from('hr_employees').insert({
    tenant_id: c.tenantId, user_id: userId, ...employeeRow(formData, c.role === 'admin'),
  })
  if (error) return { error: error.code === '23505' ? 'Tento člen už má personální kartu.' : error.message }
  revalidatePath('/hr/employees'); return {}
}

export async function updateEmployee(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_employees').update(employeeRow(formData, c.role === 'admin')).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/employees'); return {}
}

export async function deleteEmployee(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_employees').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/employees'); return {}
}
