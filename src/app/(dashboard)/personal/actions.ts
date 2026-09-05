'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
const revalidate = () => { revalidatePath('/personal'); revalidatePath('/personal/notes'); revalidatePath('/personal/tasks'); revalidatePath('/personal/calendar'); revalidatePath('/personal/goals') }

// ─── Notes ─────────────────────────────────────────────────────
export async function saveNote(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const id = str(formData, 'id')
  const row = { title: str(formData, 'title'), content: str(formData, 'content') || '', pinned: formData.get('pinned') === 'on' || formData.get('pinned') === 'true' }
  if (!row.title && !row.content) return { error: 'Vyplňte název nebo obsah.' }
  if (id) {
    const { error } = await c.admin.from('personal_notes').update({ ...row, updated_at: new Date() }).eq('id', id).eq('user_id', c.userId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('personal_notes').insert({ ...row, tenant_id: c.tenantId, user_id: c.userId })
    if (error) return { error: error.message }
  }
  revalidate(); return {}
}

export async function togglePinNote(id: string, pinned: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_notes').update({ pinned }).eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}

export async function deleteNote(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_notes').delete().eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}

// ─── Tasks ─────────────────────────────────────────────────────
export async function saveTask(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const id = str(formData, 'id')
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název úkolu.' }
  const row = { title, note: str(formData, 'note'), due_date: str(formData, 'dueDate'), priority: str(formData, 'priority') || 'normal' }
  if (id) {
    const { error } = await c.admin.from('personal_tasks').update(row).eq('id', id).eq('user_id', c.userId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('personal_tasks').insert({ ...row, tenant_id: c.tenantId, user_id: c.userId })
    if (error) return { error: error.message }
  }
  revalidate(); return {}
}

export async function toggleTask(id: string, done: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_tasks').update({ done, completed_at: done ? new Date() : null }).eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}

export async function deleteTask(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_tasks').delete().eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}

// ─── Personal calendar events ──────────────────────────────────
export async function saveEvent(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const id = str(formData, 'id')
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název události.' }
  const start = str(formData, 'startTime'); const end = str(formData, 'endTime')
  if (!start) return { error: 'Zadejte začátek.' }
  const allDay = formData.get('allDay') === 'on' || formData.get('allDay') === 'true'
  const row = {
    title, description: str(formData, 'description'),
    start_time: new Date(start).toISOString(),
    end_time: new Date(end || start).toISOString(),
    all_day: allDay,
  }
  if (id) {
    const { error } = await c.admin.from('personal_events').update(row).eq('id', id).eq('user_id', c.userId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('personal_events').insert({ ...row, tenant_id: c.tenantId, user_id: c.userId })
    if (error) return { error: error.message }
  }
  revalidate(); return {}
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_events').delete().eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}

// ─── Personal goals (week / month / year) ──────────────────────
const goalTf = (fd: FormData) => { const v = str(fd, 'timeframe'); return v === 'week' || v === 'month' || v === 'year' ? v : 'month' }
const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

export async function savePersonalGoal(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název cíle.' }
  const id = str(formData, 'id')
  const row = { title, description: str(formData, 'description'), timeframe: goalTf(formData), target_date: str(formData, 'targetDate'), progress: clamp(formData.get('progress')) }
  if (id) {
    const { error } = await c.admin.from('personal_goals').update({ ...row, updated_at: new Date() }).eq('id', id).eq('user_id', c.userId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('personal_goals').insert({ ...row, tenant_id: c.tenantId, user_id: c.userId })
    if (error) return { error: error.message }
  }
  revalidate(); return {}
}

export async function setPersonalGoalProgress(id: string, progress: number): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_goals').update({ progress: clamp(progress), updated_at: new Date() }).eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}

export async function setPersonalGoalArchived(id: string, archived: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_goals').update({ archived, updated_at: new Date() }).eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}

export async function deletePersonalGoal(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('personal_goals').delete().eq('id', id).eq('user_id', c.userId)
  if (error) return { error: error.message }
  revalidate(); return {}
}
