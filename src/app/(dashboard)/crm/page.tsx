import { requireModuleAccess } from '@/lib/supabase/tenant'
import { StatCard } from '@/components/ui/stat-card'
import { Building2, Target, TrendingUp, DollarSign } from 'lucide-react'

const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n)

export default async function CrmOverviewPage() {
  const { supabase, tenantId } = await requireModuleAccess('crm')
  if (!tenantId) return null
  const year = new Date().getFullYear()

  const [clients, deals, paidInvoices] = await Promise.all([
    supabase.from('crm_clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('crm_deals').select('value, stage').eq('tenant_id', tenantId),
    supabase.from('invoices').select('amount, issue_date').eq('tenant_id', tenantId).eq('type', 'issued').eq('status', 'paid'),
  ])

  const openDeals = (deals.data ?? []).filter((d: any) => d.stage !== 'won' && d.stage !== 'lost')
  const pipelineValue = openDeals.reduce((a: number, d: any) => a + Number(d.value || 0), 0)
  const revenue = (paidInvoices.data ?? []).filter((i: any) => new Date(i.issue_date).getFullYear() === year).reduce((a: number, i: any) => a + Number(i.amount || 0), 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Klienti" value={String(clients.count || 0)} hint="Celkem v CRM" icon={<Building2 className="size-4" />} />
      <StatCard title="Otevřené příležitosti" value={String(openDeals.length)} hint="V pipeline" icon={<Target className="size-4" />} />
      <StatCard title="Hodnota pipeline" value={czk(pipelineValue)} hint="Otevřené příležitosti" icon={<TrendingUp className="size-4" />} />
      <StatCard title="Tržby (rok)" value={czk(revenue)} hint="Uhrazené vydané faktury" tone="positive" icon={<DollarSign className="size-4" />} />
    </div>
  )
}
