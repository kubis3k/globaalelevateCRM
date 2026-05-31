import { requireModuleAccess } from '@/lib/supabase/tenant'
import { StatCard } from '@/components/ui/stat-card'
import { Clock, CalendarDays, CircleDollarSign, Wallet } from 'lucide-react'

const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n)
const hrs = (m: number) => `${(m / 60).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} h`
const iso = (d: Date) => d.toISOString().slice(0, 10)

export default async function TimeOverviewPage() {
  const { supabase, tenantId } = await requireModuleAccess('time')
  if (!tenantId) return null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))

  const { data } = await supabase.from('time_entries')
    .select('work_date, minutes, billable, hourly_rate')
    .eq('tenant_id', tenantId).gte('work_date', iso(monthStart))
  const rows = data ?? []

  const weekIso = iso(weekStart)
  const weekMin = rows.filter((r: any) => r.work_date >= weekIso).reduce((a: number, r: any) => a + r.minutes, 0)
  const monthMin = rows.reduce((a: number, r: any) => a + r.minutes, 0)
  const billableMin = rows.filter((r: any) => r.billable).reduce((a: number, r: any) => a + r.minutes, 0)
  const value = rows.filter((r: any) => r.billable && r.hourly_rate).reduce((a: number, r: any) => a + (r.minutes / 60) * Number(r.hourly_rate), 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Tento týden" value={hrs(weekMin)} hint="Odpracované hodiny" icon={<Clock className="size-4" />} />
      <StatCard title="Tento měsíc" value={hrs(monthMin)} hint="Odpracované hodiny" icon={<CalendarDays className="size-4" />} />
      <StatCard title="Fakturovatelné" value={hrs(billableMin)} hint="Tento měsíc" tone="positive" icon={<CircleDollarSign className="size-4" />} />
      <StatCard title="Hodnota (měsíc)" value={czk(value)} hint="Fakturovatelné dle sazby" icon={<Wallet className="size-4" />} />
    </div>
  )
}
