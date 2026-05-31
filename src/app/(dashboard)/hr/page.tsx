import { requireModuleAccess } from '@/lib/supabase/tenant'
import { StatCard } from '@/components/ui/stat-card'
import { Users, Plane, Clock, Briefcase } from 'lucide-react'

export default async function HrOverviewPage() {
  const { supabase, tenantId } = await requireModuleAccess('hr')
  if (!tenantId) return null

  const today = new Date().toISOString().split('T')[0]
  const [emp, pendingLeave, openJobs, outToday] = await Promise.all([
    supabase.from('hr_employees').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    supabase.from('hr_leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabase.from('hr_job_postings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'open'),
    supabase.from('hr_leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'approved').lte('start_date', today).gte('end_date', today),
  ])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Aktivní zaměstnanci" value={String(emp.count || 0)} hint="Správa personálu" icon={<Users className="size-4" />} />
      <StatCard title="Dnes mimo" value={String(outToday.count || 0)} hint="Schválená dovolená/absence" icon={<Plane className="size-4" />} />
      <StatCard title="Čekající žádosti" value={String(pendingLeave.count || 0)} hint="Ke schválení" icon={<Clock className="size-4" />} />
      <StatCard title="Otevřené pozice" value={String(openJobs.count || 0)} hint="Nábor" icon={<Briefcase className="size-4" />} />
    </div>
  )
}
