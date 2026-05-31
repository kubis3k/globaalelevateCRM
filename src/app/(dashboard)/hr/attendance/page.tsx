import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { AttendanceClient } from './attendance-client'

export default async function HrAttendancePage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 8) + '01'

  const { data: myMonth } = await supabase
    .from('hr_attendance').select('*')
    .eq('tenant_id', tenantId).eq('user_id', user.id)
    .gte('work_date', monthStart).order('work_date', { ascending: false })

  let team: any[] = []
  if (canManage) {
    const { data: teamToday } = await supabase.from('hr_attendance').select('*').eq('tenant_id', tenantId).eq('work_date', today)
    const ids = Array.from(new Set((teamToday ?? []).map((r: any) => r.user_id)))
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
    team = (teamToday ?? []).map((r: any) => {
      const p = (profiles ?? []).find((x: any) => x.id === r.user_id)
      return { ...r, name: p?.full_name || p?.username || r.user_id.slice(0, 8) }
    })
  }

  const todayRow = (myMonth ?? []).find((r: any) => r.work_date === today) || null
  return <AttendanceClient todayRow={todayRow} myMonth={myMonth ?? []} team={team} canManage={canManage} />
}
