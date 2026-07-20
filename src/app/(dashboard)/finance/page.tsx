import { requireModuleAccess } from '@/lib/supabase/tenant'
import { getUctoSummary } from '@/lib/ucto'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowDownLeft, ArrowUpRight, ExternalLink, FileText, Landmark, Percent, TrendingUp, Unplug } from 'lucide-react'
import { CashflowChart } from './cashflow-chart'
import { TransactionsManager } from './transactions-manager'

const czk = (n: number, currency = 'CZK') =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

// Finance = souhrn z účetního systému (autoritativní zdroj) + provozní
// evidence transakcí ve work (schválené výdaje, zaúčtované objednávky…).
export default async function FinancePage() {
  const { supabase, tenantId } = await requireModuleAccess('finance')
  if (!tenantId) return <NoTenantView />

  const [ucto, { data: transactions }, { data: categories }] = await Promise.all([
    getUctoSummary(),
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

  const chartData = ucto.connected
    ? ucto.months.flatMap((m) => [
        { date: `${m.month}-01`, type: 'income', amount: m.inflow },
        { date: `${m.month}-01`, type: 'expense', amount: m.outflow },
      ]).filter((r) => r.amount > 0)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Finance" description="Hlavní čísla z účetního systému Globaal Elevate." />
        <a
          href="https://ucto.globaalelevate.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          Otevřít účetnictví
        </a>
      </div>

      {!ucto.connected ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <Unplug className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <div className="font-medium text-foreground">Účetnictví není připojeno</div>
            <div className="text-muted-foreground">{ucto.reason}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Stav banky" value={czk(ucto.bankBalance)} tone={ucto.bankBalance >= 0 ? 'neutral' : 'negative'} hint="Z bankovních pohybů" icon={<Landmark className="size-4" />} />
            <StatCard title="Tržby (rok)" value={czk(ucto.revenueYtd)} tone="positive" hint="Vydané faktury + pokladna" icon={<ArrowUpRight className="size-4" />} />
            <StatCard title="Náklady (rok)" value={czk(ucto.costsYtd)} tone="negative" hint="Přijaté faktury + pokladna" icon={<ArrowDownLeft className="size-4" />} />
            <StatCard title="Zisk (rok)" value={czk(ucto.profitYtd)} tone={ucto.profitYtd >= 0 ? 'positive' : 'negative'} hint="Tržby − náklady" icon={<TrendingUp className="size-4" />} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Pohledávky" value={czk(ucto.receivables)} hint={`${ucto.receivablesCount} neuhrazených vydaných faktur`} icon={<FileText className="size-4" />} />
            <StatCard title="Závazky" value={czk(ucto.payables)} tone={ucto.payables > 0 ? 'negative' : 'neutral'} hint={`${ucto.payablesCount} neuhrazených přijatých faktur`} icon={<FileText className="size-4" />} />
            {ucto.isVatPayer ? (
              <StatCard title="DPH k odvodu (Q)" value={czk(ucto.vatDueQuarter || 0)} hint="Běžné čtvrtletí" icon={<Percent className="size-4" />} />
            ) : (
              <StatCard title="Obrat 12 měsíců" value={czk(ucto.obrat12m || 0)} hint={`Do limitu DPH zbývá ${czk(ucto.zbyvaDoLimitu || 0)}`} icon={<Percent className="size-4" />} />
            )}
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cash-flow (účetnictví)</CardTitle>
                <CardDescription>Bankovní pohyby za posledních 12 měsíců</CardDescription>
              </CardHeader>
              <CardContent>
                <CashflowChart data={chartData} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Provozní evidence (work)</h2>
        <p className="text-sm text-muted-foreground">Interní transakce — schválené výdaje, zaúčtované objednávky, ruční záznamy. Účetně závazná čísla jsou v účetnictví výše.</p>
      </div>
      <TransactionsManager transactions={safe as any} categories={categories ?? []} invNumbers={invNumbers} />
    </div>
  )
}
