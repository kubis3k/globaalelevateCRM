import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { HrReviewsClient } from './reviews-client'

export default async function HrReviewsPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)

  const [{ data: tenantUsers }, { data: reviews }] = await Promise.all([
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('hr_reviews').select('*').eq('tenant_id', tenantId).order('review_date', { ascending: false }),
  ])
  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string) => { const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || id.slice(0, 8) }
  const people = ids.map((id: string) => ({ user_id: id, name: nameOf(id) }))
  let list = (reviews ?? []).map((r: any) => ({ ...r, employee: nameOf(r.user_id), reviewer: r.reviewer_id ? nameOf(r.reviewer_id) : null }))
  if (!canManage) list = list.filter((r: any) => r.user_id === user.id)

  return <HrReviewsClient reviews={list} people={people} canManage={canManage} />
}
