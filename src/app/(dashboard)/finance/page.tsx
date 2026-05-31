import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react'
import { CashflowChart } from './cashflow-chart'
import { TransactionsManager } from './transactions-manager'

const czk = (n: number, currency = 'CZK') =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(n)

export default async function FinancePage() {
  const { supabase, tenantId } = await requireModuleAccess('finance')
  if (!tenantId) return <NoTenantView />

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase.from('transactions').select('*').eq('tenant_id', tenantId).order('date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('transaction_categories').select('id, name').eq('tenant_id', tenantId).order('name', { ascending: true }),
  ])

  const safe = transactions || []
  const invoiceIds = Array.from(new Set(safe.map((t: any) => t.invoice_id).filter(Boolean)))
  const { data: linkedInvoices } = invoiceIds.length
    ? await supabase.from('invoices').select('id, invoice_number').in('id', invoiceIds as string[])
    : { data: [] as any[] }
  const invNumbers: Record<string, string> = {}
  for (const inv of linkedInvoices ?? []) invNumbers[inv.id] = inv.invoice_number

  const totalIncome = safe.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
  const totalExpense = safe.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
  const balance = totalIncome - totalExpense
  const chartData = [...safe].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" description="Sledujte cash-flow a spravujte transakce v reálném čase." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Celkový zůstatek" value={czk(balance)} tone={balance >= 0 ? 'neutral' : 'negative'} icon={<DollarSign className="size-4" />} />
        <StatCard title="Příjmy" value={czk(totalIncome)} tone="positive" icon={<TrendingUp className="size-4" />} />
        <StatCard title="Výdaje" value={czk(totalExpense)} tone="negative" icon={<TrendingDown className="size-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vývoj cash-flow</CardTitle>
          <CardDescription>Kumulativní zůstatek v čase</CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart data={chartData} />
        </CardContent>
      </Card>

      <TransactionsManager transactions={safe as any} categories={categories ?? []} invNumbers={invNumbers} />
    </div>
  )
}
