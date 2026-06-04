import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { PortalClient } from './portal-client'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const { supabase, user, tenantId } = await requireModuleAccess('portal')
  if (!tenantId) return <NoTenantView />
  const uid = user.id
  const today = new Date().toISOString().slice(0, 10)
  const yearStart = `${new Date().getFullYear()}-01-01`
  const from = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10)
  const to = new Date(Date.now() + 75 * 86400000).toISOString().slice(0, 10)

  const [{ data: emp }, { data: myAsg }, { data: upcomingShifts }, { data: leave }] = await Promise.all([
    supabase.from('hr_employees').select('annual_leave_days, hourly_rate, employment_type, position').eq('tenant_id', tenantId).eq('user_id', uid).maybeSingle(),
    supabase.from('hr_shift_assignments').select('id, shift_id, status').eq('tenant_id', tenantId).eq('user_id', uid),
    supabase.from('hr_shifts').select('id, work_date, start_time, end_time, role, location, project_id, required_count').eq('tenant_id', tenantId).gte('work_date', today).lte('work_date', to).order('work_date').order('start_time'),
    supabase.from('hr_leave_requests').select('id, type, start_date, end_date, working_days, status, reason').eq('tenant_id', tenantId).eq('user_id', uid).gte('start_date', yearStart).order('start_date', { ascending: false }),
  ])

  const myShiftIds = (myAsg ?? []).map((a: any) => a.shift_id)
  const { data: myShifts } = myShiftIds.length
    ? await supabase.from('hr_shifts').select('id, work_date, start_time, end_time, role, location, project_id').in('id', myShiftIds).gte('work_date', from).lte('work_date', to)
    : { data: [] as any[] }

  const upIds = (upcomingShifts ?? []).map((s: any) => s.id)
  const { data: upAsg } = upIds.length
    ? await supabase.from('hr_shift_assignments').select('shift_id, user_id, status').in('shift_id', upIds)
    : { data: [] as any[] }

  const projIds = [...new Set([...(myShifts ?? []), ...(upcomingShifts ?? [])].map((s: any) => s.project_id).filter(Boolean))]
  const { data: projects } = projIds.length ? await supabase.from('projects').select('id, name').in('id', projIds) : { data: [] as any[] }
  const projName = (id: string | null) => (projects ?? []).find((p: any) => p.id === id)?.name || null
  const asgFor = (shiftId: string) => (myAsg ?? []).find((a: any) => a.shift_id === shiftId)

  const shifts = (myShifts ?? []).map((s: any) => {
    const a = asgFor(s.id)
    return { id: a?.id, shift_id: s.id, work_date: s.work_date, start_time: s.start_time, end_time: s.end_time, role: s.role, location: s.location, project: projName(s.project_id), status: a?.status || 'assigned' }
  })

  const openShifts = (upcomingShifts ?? []).filter((s: any) => {
    const active = (upAsg ?? []).filter((a: any) => a.shift_id === s.id && a.status !== 'declined')
    const mine = (upAsg ?? []).some((a: any) => a.shift_id === s.id && a.user_id === uid)
    return !mine && active.length < (s.required_count || 1)
  }).map((s: any) => ({
    id: s.id, work_date: s.work_date, start_time: s.start_time, end_time: s.end_time, role: s.role, location: s.location, project: projName(s.project_id),
    free: (s.required_count || 1) - (upAsg ?? []).filter((a: any) => a.shift_id === s.id && a.status !== 'declined').length,
  }))

  const leaveList = leave ?? []
  const annual = emp?.annual_leave_days ?? 20
  const used = leaveList.filter((l: any) => l.type === 'vacation' && l.status === 'approved').reduce((a: number, l: any) => a + Number(l.working_days || 0), 0)
  const pending = leaveList.filter((l: any) => l.type === 'vacation' && l.status === 'pending').reduce((a: number, l: any) => a + Number(l.working_days || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Můj portál" description="Tvůj rozvrh směn, odpracované hodiny a žádosti o volno." />
      <PortalClient
        shifts={shifts}
        openShifts={openShifts}
        leave={leaveList}
        balance={{ annual, used, pending, remaining: annual - used }}
        hourly={['dpp', 'dpc', 'part_time'].includes(emp?.employment_type || '')}
        hourlyRate={Number(emp?.hourly_rate || 0)}
      />
    </div>
  )
}
