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

// ─── Leave ─────────────────────────────────────────────────────
const LEAVE_LABELS: Record<string, string> = { vacation: 'Dovolená', sick: 'Nemoc', personal: 'Osobní volno', unpaid: 'Neplacené volno' }

function workingDaysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end + 'T00:00:00Z')
  if (e < s) return 0
  let count = 0
  for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

export async function requestLeave(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const type = str(formData, 'type') || 'vacation'
  const start = str(formData, 'startDate')
  const end = str(formData, 'endDate')
  if (!start || !end) return { error: 'Zadejte datum od i do.' }
  if (end < start) return { error: 'Datum „do" musí být po datu „od".' }
  const { error } = await c.admin.from('hr_leave_requests').insert({
    tenant_id: c.tenantId, user_id: c.userId, type, start_date: start, end_date: end,
    working_days: workingDaysBetween(start, end), reason: str(formData, 'reason'), status: 'pending',
  })
  if (error) return { error: error.message }
  revalidatePath('/hr/leave'); revalidatePath('/hr'); return {}
}

export async function reviewLeave(id: string, decision: 'approved' | 'rejected'): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { data: req } = await c.admin.from('hr_leave_requests').select('*').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!req) return { error: 'Žádost nenalezena.' }
  const { error } = await c.admin.from('hr_leave_requests')
    .update({ status: decision, reviewed_by: c.userId, reviewed_at: new Date().toISOString() })
    .eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  if (decision === 'approved') {
    // Reflect approved leave in the shared calendar (best-effort).
    await c.admin.from('calendar_events').insert({
      tenant_id: c.tenantId,
      title: LEAVE_LABELS[req.type] || 'Volno',
      description: req.reason || null,
      start_time: new Date(req.start_date + 'T08:00:00').toISOString(),
      end_time: new Date(req.end_date + 'T16:00:00').toISOString(),
      assigned_to: req.user_id,
      created_by: c.userId,
    })
    revalidatePath('/calendar')
  }
  revalidatePath('/hr/leave'); revalidatePath('/hr'); return {}
}

export async function cancelLeave(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: req } = await c.admin.from('hr_leave_requests').select('user_id, status').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!req) return { error: 'Žádost nenalezena.' }
  const owner = req.user_id === c.userId
  if (!owner && !canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  if (owner && !canManageHr(c.role) && req.status !== 'pending') return { error: 'Schválenou žádost může zrušit jen manažer.' }
  const { error } = await c.admin.from('hr_leave_requests').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/leave'); revalidatePath('/hr'); return {}
}

// ─── Attendance ────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export async function clockIn(): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const today = todayStr()
  const { data: existing } = await c.admin.from('hr_attendance').select('id, clock_in').eq('tenant_id', c.tenantId).eq('user_id', c.userId).eq('work_date', today).maybeSingle()
  if (existing?.clock_in) return { error: 'Příchod už je dnes zaznamenán.' }
  if (existing) {
    await c.admin.from('hr_attendance').update({ clock_in: new Date().toISOString() }).eq('id', existing.id)
  } else {
    const { error } = await c.admin.from('hr_attendance').insert({ tenant_id: c.tenantId, user_id: c.userId, work_date: today, clock_in: new Date().toISOString() })
    if (error) return { error: error.message }
  }
  revalidatePath('/hr/attendance'); return {}
}

export async function clockOut(): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const today = todayStr()
  const { data: existing } = await c.admin.from('hr_attendance').select('id, clock_in, clock_out').eq('tenant_id', c.tenantId).eq('user_id', c.userId).eq('work_date', today).maybeSingle()
  if (!existing?.clock_in) return { error: 'Nejdřív zaznamenejte příchod.' }
  if (existing.clock_out) return { error: 'Odchod už je zaznamenán.' }
  const { error } = await c.admin.from('hr_attendance').update({ clock_out: new Date().toISOString() }).eq('id', existing.id)
  if (error) return { error: error.message }
  revalidatePath('/hr/attendance'); return {}
}
