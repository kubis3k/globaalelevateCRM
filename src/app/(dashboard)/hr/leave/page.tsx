import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { LeaveClient } from './leave-client'

export default async function HrLeavePage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)
  const year = new Date().getFullYear()

  const [{ data: myEmp }, { data: requests }] = await Promise.all([
    supabase.from('hr_employees').select('annual_leave_days').eq('tenant_id', tenantId).eq('user_id', user.id).maybeSingle(),
    canManage
      ? supabase.from('hr_leave_requests').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
      : supabase.from('hr_leave_requests').select('*').eq('tenant_id', tenantId).eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const ids = Array.from(new Set((requests ?? []).map((r: any) => r.user_id)))
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', ids)
    : { data: [] as any[] }
  const nameOf = (id: string) => {
    const p = (profiles ?? []).find((x: any) => x.id === id)
    return p?.full_name || p?.username || id.slice(0, 8)
  }

  const all = (requests ?? []).map((r: any) => ({ ...r, name: nameOf(r.user_id) }))
  const mine = all.filter((r: any) => r.user_id === user.id)
  const pending = canManage ? all.filter((r: any) => r.status === 'pending') : []

  const entitlement = myEmp?.annual_leave_days ?? 20
  const used = mine
    .filter((r: any) => r.status === 'approved' && r.type === 'vacation' && new Date(r.start_date).getFullYear() === year)
    .reduce((a: number, r: any) => a + Number(r.working_days || 0), 0)

  return <LeaveClient mine={mine} pending={pending} canManage={canManage} entitlement={entitlement} used={used} />
}
