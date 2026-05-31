'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string | null }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }
const canManageAll = (role: string | null) => role === 'admin' || role === 'manager'

function minutesFromForm(fd: FormData): number | null {
  const h = (fd.get('hours') as string)?.trim()
  if (!h) return null
  const n = Number(h.replace(',', '.'))
  if (!isFinite(n) || n <= 0) return null
  return Math.round(n * 60)
}

export async function createTimeEntry(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const minutes = minutesFromForm(formData); if (!minutes) return { error: 'Zadejte počet hodin (> 0).' }
  const workDate = str(formData, 'workDate'); if (!workDate) return { error: 'Zadejte datum.' }
  const rate = str(formData, 'hourlyRate')
  const { error } = await c.admin.from('time_entries').insert({
    tenant_id: c.tenantId, user_id: c.userId,
    project_id: opt(formData, 'projectId'),
    work_date: workDate, minutes,
    description: str(formData, 'description'),
    billable: formData.get('billable') === 'on',
    hourly_rate: rate ? Number(rate.replace(',', '.')) : null,
    currency: str(formData, 'currency') || 'CZK',
  })
  if (error) return { error: error.message }
  revalidatePath('/time/entries'); revalidatePath('/time'); revalidatePath('/projects'); return {}
}

export async function deleteTimeEntry(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  let q = c.admin.from('time_entries').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (!canManageAll(c.role)) q = q.eq('user_id', c.userId)
  const { error } = await q
  if (error) return { error: error.message }
  revalidatePath('/time/entries'); revalidatePath('/time'); revalidatePath('/projects'); return {}
}
