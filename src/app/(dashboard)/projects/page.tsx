import { requireModuleAccess } from '@/lib/supabase/tenant'
import { StatCard } from '@/components/ui/stat-card'
import { FolderKanban, CircleCheckBig, ListTodo, DollarSign } from 'lucide-react'

const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n)
const ACTIVE_STATUSES = ['planning', 'active', 'on_hold']

export default async function ProjectsOverviewPage() {
  const { supabase, tenantId } = await requireModuleAccess('projects')
  if (!tenantId) return null

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from('projects').select('status, budget').eq('tenant_id', tenantId),
    supabase.from('project_tasks').select('status').eq('tenant_id', tenantId),
  ])

  const ps = projects ?? []
  const active = ps.filter((p: any) => ACTIVE_STATUSES.includes(p.status))
  const completed = ps.filter((p: any) => p.status === 'completed').length
  const budget = active.reduce((a: number, p: any) => a + Number(p.budget || 0), 0)
  const openTasks = (tasks ?? []).filter((t: any) => t.status !== 'done').length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Aktivní projekty" value={String(active.length)} hint="Rozpracované zakázky" icon={<FolderKanban className="size-4" />} />
      <StatCard title="Dokončené" value={String(completed)} hint="Uzavřené projekty" tone="positive" icon={<CircleCheckBig className="size-4" />} />
      <StatCard title="Otevřené úkoly" value={String(openTasks)} hint="Napříč projekty" icon={<ListTodo className="size-4" />} />
      <StatCard title="Hodnota rozpočtů" value={czk(budget)} hint="Aktivní projekty" icon={<DollarSign className="size-4" />} />
    </div>
  )
}
