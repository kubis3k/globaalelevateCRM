import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { HrEmployeesClient } from './employees-client'

export default async function HrEmployeesPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)

  const [{ data: tenantUsers }, { data: employees }, { data: departments }] = await Promise.all([
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('hr_employees').select('*').eq('tenant_id', tenantId),
    supabase.from('hr_departments').select('*').eq('tenant_id', tenantId).order('name'),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', ids)
    : { data: [] as any[] }
  const nameOf = (id: string) => {
    const p = (profiles ?? []).find((x: any) => x.id === id)
    return { name: p?.full_name || p?.username || id.slice(0, 8), username: p?.username || '' }
  }

  const people = ids.map((id: string) => ({ user_id: id, ...nameOf(id) }))
  const deptName = (id: string | null) => (departments ?? []).find((d: any) => d.id === id)?.name || null

  const employeesFull = (employees ?? []).map((e: any) => ({
    ...e,
    ...nameOf(e.user_id),
    department_name: deptName(e.department_id),
    manager_name: e.manager_id ? nameOf(e.manager_id).name : null,
  }))

  const visible = canManage ? employeesFull : employeesFull.filter((e: any) => e.user_id === user.id)
  const withRecord = new Set((employees ?? []).map((e: any) => e.user_id))
  const available = people.filter((p) => !withRecord.has(p.user_id))

  return (
    <HrEmployeesClient
      employees={visible}
      departments={departments ?? []}
      people={people}
      available={available}
      canManage={canManage}
      isAdmin={role === 'admin'}
    />
  )
}
