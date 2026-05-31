'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageMilestones } from '@/lib/permissions'

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

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const tf = (fd: FormData) => { const v = str(fd, 'timeframe'); return v === 'week' || v === 'month' || v === 'year' ? v : 'month' }
const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

export async function saveMilestone(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageMilestones(c.role)) return { error: 'Firemní cíle může spravovat jen admin nebo manažer.' }
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název cíle.' }
  const id = str(formData, 'id')
  const row = { title, description: str(formData, 'description'), timeframe: tf(formData), target_date: str(formData, 'targetDate'), progress: clamp(formData.get('progress')) }
  if (id) {
    const { error } = await c.admin.from('milestones').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('milestones').insert({ ...row, tenant_id: c.tenantId, created_by: c.userId })
    if (error) return { error: error.message }
  }
  revalidatePath('/milestones'); return {}
}

export async function setMilestoneProgress(id: string, progress: number): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageMilestones(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('milestones').update({ progress: clamp(progress), updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/milestones'); return {}
}

export async function deleteMilestone(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageMilestones(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('milestones').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/milestones'); return {}
}
