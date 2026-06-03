import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { HrTrainingClient } from './training-client'

export default async function HrTrainingPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)

  const [{ data: tenantUsers }, { data: trainings }] = await Promise.all([
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('hr_trainings').select('*').eq('tenant_id', tenantId).order('expires_on', { ascending: true, nullsFirst: false }),
  ])
  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string) => { const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || id.slice(0, 8) }
  const people = ids.map((id: string) => ({ user_id: id, name: nameOf(id) }))
  let list = (trainings ?? []).map((t: any) => ({ ...t, employee: nameOf(t.user_id) }))
  if (!canManage) list = list.filter((t: any) => t.user_id === user.id)

  return <HrTrainingClient trainings={list} people={people} canManage={canManage} />
}
