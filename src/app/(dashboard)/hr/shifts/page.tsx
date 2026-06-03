import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { HrShiftsClient } from './shifts-client'

export default async function HrShiftsPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)

  const from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const to = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)

  const [{ data: shifts }, { data: emps }, { data: projects }, { data: tenantUsers }] = await Promise.all([
    supabase.from('hr_shifts').select('*').eq('tenant_id', tenantId).gte('work_date', from).lte('work_date', to).order('work_date').order('start_time'),
    supabase.from('hr_employees').select('user_id, hourly_rate, position').eq('tenant_id', tenantId).eq('status', 'active'),
    supabase.from('projects').select('id, name, budget').eq('tenant_id', tenantId).order('name'),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
  ])

  const shiftIds = (shifts ?? []).map((s: any) => s.id)
  const { data: assigns } = shiftIds.length
    ? await supabase.from('hr_shift_assignments').select('*').in('shift_id', shiftIds)
    : { data: [] as any[] }

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string) => { const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || id.slice(0, 8) }
  const rateOf = (uid: string) => Number((emps ?? []).find((e: any) => e.user_id === uid)?.hourly_rate || 0)

  const shiftsFull = (shifts ?? []).map((s: any) => ({
    ...s,
    assignments: (assigns ?? []).filter((a: any) => a.shift_id === s.id).map((a: any) => ({ ...a, name: nameOf(a.user_id), rate: rateOf(a.user_id) })),
  }))
  const employees = (emps ?? []).map((e: any) => ({ user_id: e.user_id, name: nameOf(e.user_id), hourly_rate: Number(e.hourly_rate || 0), position: e.position }))

  return <HrShiftsClient shifts={shiftsFull} employees={employees} projects={projects ?? []} canManage={canManage} currentUserId={user.id} />
}
