'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageHr } from '@/lib/permissions'
import { sendPushToUsers } from '@/lib/push/webpush'
import { workingDaysBetween } from '@/lib/cz-holidays'

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
    weekly_hours: str(fd, 'weeklyHours') ? Number(str(fd, 'weeklyHours')) : null,
    personal_no: str(fd, 'personalNo'),
    annual_leave_days: Number(str(fd, 'annualLeaveDays') || 20),
    status: str(fd, 'status') || 'active',
    notes: str(fd, 'notes'),
  }
  if (isAdmin) {
    const salary = str(fd, 'salary')
    row.salary = salary ? Number(salary) : null
    row.salary_currency = str(fd, 'salaryCurrency') || 'CZK'
    const rate = str(fd, 'hourlyRate')
    row.hourly_rate = rate ? Number(rate) : null
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
  const isAdmin = c.role === 'admin'
  // Audit salary changes (sensitive).
  if (isAdmin) {
    const { data: old } = await c.admin.from('hr_employees').select('salary').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
    const ns = str(formData, 'salary') ? Number(str(formData, 'salary')) : null
    if (old && Number(old.salary ?? 0) !== Number(ns ?? 0)) {
      await c.admin.from('hr_audit').insert({ tenant_id: c.tenantId, actor_id: c.userId, entity: 'hr_employees', entity_id: id, action: 'salary_change', detail: `${old.salary ?? '—'} → ${ns ?? '—'}` })
    }
  }
  const { error } = await c.admin.from('hr_employees').update(employeeRow(formData, isAdmin)).eq('id', id).eq('tenant_id', c.tenantId)
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

// ─── Contracts / dohody ────────────────────────────────────────
function contractRow(fd: FormData) {
  return {
    type: str(fd, 'type') || 'hpp',
    title: str(fd, 'title'),
    start_date: str(fd, 'startDate'),
    end_date: str(fd, 'endDate'),
    weekly_hours: str(fd, 'weeklyHours') ? Number(str(fd, 'weeklyHours')) : null,
    hourly_rate: str(fd, 'hourlyRate') ? Number(str(fd, 'hourlyRate')) : null,
    salary: str(fd, 'salary') ? Number(str(fd, 'salary')) : null,
    currency: str(fd, 'currency') || 'CZK',
    status: str(fd, 'status') || 'active',
  }
}

export async function saveContract(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Smlouvy může spravovat jen admin nebo manažer.' }
  const id = opt(formData, 'id')
  const userId = opt(formData, 'userId')
  if (!id && !userId) return { error: 'Vyberte zaměstnance.' }
  const row: Record<string, unknown> = contractRow(formData)
  const file = formData.get('file') as File | null
  if (file && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) return { error: 'Soubor je větší než 10 MB.' }
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    const path = `${c.tenantId}/contracts/${crypto.randomUUID()}${ext}`
    const { error: upErr } = await c.admin.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
    if (upErr) return { error: upErr.message }
    row.storage_path = path
  }
  if (id) {
    row.updated_at = new Date().toISOString()
    row.expiry_reminded_at = null // re-arm expiry reminders after an edit
    const { error } = await c.admin.from('hr_contracts').update(row).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
    await c.admin.from('hr_audit').insert({ tenant_id: c.tenantId, actor_id: c.userId, entity: 'hr_contracts', entity_id: id, action: 'updated' })
  } else {
    const { data, error } = await c.admin.from('hr_contracts').insert({ tenant_id: c.tenantId, user_id: userId, created_by: c.userId, ...row }).select('id').single()
    if (error) return { error: error.message }
    await c.admin.from('hr_audit').insert({ tenant_id: c.tenantId, actor_id: c.userId, entity: 'hr_contracts', entity_id: data?.id, action: 'created' })
  }
  revalidatePath('/hr/contracts'); revalidatePath('/hr'); return {}
}

export async function deleteContract(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { data: ct } = await c.admin.from('hr_contracts').select('storage_path').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (ct?.storage_path) { try { await c.admin.storage.from(BUCKET).remove([ct.storage_path]) } catch { } }
  const { error } = await c.admin.from('hr_contracts').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/contracts'); revalidatePath('/hr'); return {}
}

export async function acknowledgeContract(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: ct } = await c.admin.from('hr_contracts').select('user_id').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!ct) return { error: 'Smlouva nenalezena.' }
  if (ct.user_id !== c.userId && !canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_contracts').update({ acknowledged_at: new Date().toISOString(), acknowledged_by: c.userId }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  await c.admin.from('hr_audit').insert({ tenant_id: c.tenantId, actor_id: c.userId, entity: 'hr_contracts', entity_id: id, action: 'acknowledged' })
  revalidatePath('/hr/contracts'); return {}
}

export async function getContractUrl(id: string): Promise<{ url?: string; error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: ct } = await c.admin.from('hr_contracts').select('user_id, storage_path').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!ct?.storage_path) return { error: 'Soubor není přiložen.' }
  if (ct.user_id !== c.userId && !canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { data, error } = await c.admin.storage.from(BUCKET).createSignedUrl(ct.storage_path, 60)
  if (error) return { error: error.message }
  return { url: data.signedUrl }
}

// ─── Leave ─────────────────────────────────────────────────────
const LEAVE_LABELS: Record<string, string> = { vacation: 'Dovolená', sick: 'Nemoc', personal: 'Osobní volno', unpaid: 'Neplacené volno' }

// workingDaysBetween now lives in @/lib/cz-holidays (excludes weekends + CZ state holidays).

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
  // Notify HR managers about the new request (best-effort).
  try {
    const { data: mgrs } = await c.admin.from('tenant_users').select('user_id')
      .eq('tenant_id', c.tenantId).in('role', ['admin', 'manager'])
    const recipients = (mgrs || []).map((r: any) => r.user_id).filter((id: string) => id && id !== c.userId)
    if (recipients.length) {
      await sendPushToUsers(c.admin, recipients, 'hr', {
        title: 'Nová žádost o dovolenou',
        body: `${start} – ${end}`,
        url: '/hr/leave',
      })
    }
  } catch (e) { console.error('[push] hr leave request notify failed', e) }
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
  // Notify the requester of the decision (best-effort).
  try {
    if (req.user_id && req.user_id !== c.userId) {
      await sendPushToUsers(c.admin, [req.user_id], 'hr', {
        title: decision === 'approved' ? 'Dovolená schválena' : 'Dovolená zamítnuta',
        body: `${req.start_date} – ${req.end_date}`,
        url: '/hr/leave',
      })
    }
  } catch (e) { console.error('[push] hr leave review notify failed', e) }
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

// ─── Documents (private storage bucket: hr-documents) ──────────
const BUCKET = 'hr-documents'

export async function uploadDocument(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Vyberte soubor.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Soubor je větší než 10 MB.' }
  let targetUser = c.userId
  const forUser = opt(formData, 'userId')
  if (forUser && forUser !== c.userId) {
    if (!canManageHr(c.role)) return { error: 'Nahrávat dokumenty ostatním může jen manažer.' }
    targetUser = forUser
  }
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
  const path = `${c.tenantId}/${targetUser}/${crypto.randomUUID()}${ext}`
  const { error: upErr } = await c.admin.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (upErr) return { error: upErr.message }
  const { error } = await c.admin.from('hr_documents').insert({
    tenant_id: c.tenantId, user_id: targetUser, name: str(formData, 'name') || file.name,
    category: str(formData, 'category') || 'other', storage_path: path, uploaded_by: c.userId,
  })
  if (error) return { error: error.message }
  revalidatePath('/hr/documents'); return {}
}

export async function getDocumentUrl(id: string): Promise<{ url?: string; error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: doc } = await c.admin.from('hr_documents').select('user_id, storage_path').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!doc) return { error: 'Dokument nenalezen.' }
  if (doc.user_id !== c.userId && !canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { data, error } = await c.admin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 60)
  if (error) return { error: error.message }
  return { url: data.signedUrl }
}

export async function deleteDocument(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: doc } = await c.admin.from('hr_documents').select('user_id, storage_path').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!doc) return { error: 'Dokument nenalezen.' }
  if (doc.user_id !== c.userId && !canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  await c.admin.storage.from(BUCKET).remove([doc.storage_path])
  const { error } = await c.admin.from('hr_documents').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/documents'); return {}
}

// ─── Recruitment ───────────────────────────────────────────────
export async function createJob(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název pozice.' }
  const { error } = await c.admin.from('hr_job_postings').insert({
    tenant_id: c.tenantId, title, department_id: opt(formData, 'departmentId'), description: str(formData, 'description'), status: 'open',
  })
  if (error) return { error: error.message }
  revalidatePath('/hr/recruitment'); revalidatePath('/hr'); return {}
}

export async function setJobStatus(id: string, status: 'open' | 'closed'): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_job_postings').update({ status }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/recruitment'); revalidatePath('/hr'); return {}
}

export async function deleteJob(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_job_postings').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/recruitment'); revalidatePath('/hr'); return {}
}

export async function createCandidate(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const name = str(formData, 'name'); if (!name) return { error: 'Zadejte jméno kandidáta.' }
  const { error } = await c.admin.from('hr_candidates').insert({
    tenant_id: c.tenantId, job_id: opt(formData, 'jobId'), name,
    email: str(formData, 'email'), phone: str(formData, 'phone'), notes: str(formData, 'notes'), stage: 'applied',
  })
  if (error) return { error: error.message }
  revalidatePath('/hr/recruitment'); return {}
}

export async function setCandidateStage(id: string, stage: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_candidates').update({ stage }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/recruitment'); return {}
}

export async function deleteCandidate(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_candidates').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/recruitment'); return {}
}

// ─── Self-service ──────────────────────────────────────────────
export async function updateOwnProfile(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('hr_employees').update({
    phone: str(formData, 'phone'),
    personal_email: str(formData, 'personalEmail'),
    address: str(formData, 'address'),
  }).eq('user_id', c.userId).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/employees'); return {}
}

// ─── Onboarding / offboarding checklists ───────────────────────
export async function saveChecklistTemplate(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const name = str(formData, 'name'); if (!name) return { error: 'Zadejte název šablony.' }
  const kind = str(formData, 'kind') === 'offboarding' ? 'offboarding' : 'onboarding'
  const items = (formData.getAll('items') as string[]).map((s) => s.trim()).filter(Boolean)
  const id = opt(formData, 'id')
  let checklistId = id
  if (id) {
    await c.admin.from('hr_checklists').update({ name, kind }).eq('id', id).eq('tenant_id', c.tenantId)
    await c.admin.from('hr_checklist_items').delete().eq('checklist_id', id).eq('tenant_id', c.tenantId)
  } else {
    const { data, error } = await c.admin.from('hr_checklists').insert({ tenant_id: c.tenantId, name, kind }).select('id').single()
    if (error) return { error: error.message }
    checklistId = data.id
  }
  if (checklistId && items.length) {
    await c.admin.from('hr_checklist_items').insert(items.map((label, i) => ({ tenant_id: c.tenantId, checklist_id: checklistId, label, sort: i })))
  }
  revalidatePath('/hr/onboarding'); return {}
}

export async function deleteChecklist(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_checklists').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/onboarding'); return {}
}

export async function assignChecklist(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const userId = opt(formData, 'userId'); if (!userId) return { error: 'Vyberte zaměstnance.' }
  const checklistId = opt(formData, 'checklistId'); if (!checklistId) return { error: 'Vyberte šablonu.' }
  const { data: cl } = await c.admin.from('hr_checklists').select('name, kind').eq('id', checklistId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!cl) return { error: 'Šablona nenalezena.' }
  const { data: items } = await c.admin.from('hr_checklist_items').select('label, sort').eq('checklist_id', checklistId).eq('tenant_id', c.tenantId).order('sort')
  const { data: run, error } = await c.admin.from('hr_checklist_runs')
    .insert({ tenant_id: c.tenantId, user_id: userId, checklist_id: checklistId, name: cl.name, kind: cl.kind, created_by: c.userId })
    .select('id').single()
  if (error) return { error: error.message }
  if (run?.id && items?.length) {
    await c.admin.from('hr_checklist_run_items').insert(items.map((it: any) => ({ tenant_id: c.tenantId, run_id: run.id, label: it.label, sort: it.sort })))
  }
  try { if (userId !== c.userId) await sendPushToUsers(c.admin, [userId], 'hr', { title: cl.kind === 'offboarding' ? 'Offboarding zahájen' : 'Onboarding zahájen', body: cl.name, url: '/hr/onboarding' }) } catch { }
  revalidatePath('/hr/onboarding'); return {}
}

export async function toggleRunItem(id: string, done: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_checklist_run_items')
    .update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? c.userId : null })
    .eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/onboarding'); return {}
}

export async function deleteRun(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageHr(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('hr_checklist_runs').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/hr/onboarding'); return {}
}
