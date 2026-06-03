import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { HrOnboardingClient } from './onboarding-client'

export default async function HrOnboardingPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)

  const [{ data: tenantUsers }, { data: checklists }, { data: items }, { data: runs }, { data: runItems }] = await Promise.all([
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('hr_checklists').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('hr_checklist_items').select('id, checklist_id, label, sort').eq('tenant_id', tenantId).order('sort'),
    supabase.from('hr_checklist_runs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('hr_checklist_run_items').select('*').eq('tenant_id', tenantId).order('sort'),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string) => { const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || id.slice(0, 8) }
  const people = ids.map((id: string) => ({ user_id: id, name: nameOf(id) }))

  const templates = (checklists ?? []).map((cl: any) => ({ ...cl, items: (items ?? []).filter((i: any) => i.checklist_id === cl.id) }))
  let runsFull = (runs ?? []).map((r: any) => ({ ...r, employee: nameOf(r.user_id), items: (runItems ?? []).filter((ri: any) => ri.run_id === r.id) }))
  if (!canManage) runsFull = runsFull.filter((r: any) => r.user_id === user.id)

  return <HrOnboardingClient templates={templates} runs={runsFull} people={people} canManage={canManage} />
}
