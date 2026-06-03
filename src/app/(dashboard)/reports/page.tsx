import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Receipt, BarChart3 } from 'lucide-react'
import { CashflowChart } from '../finance/cashflow-chart'

const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n)

const DEAL_STAGES = [
  { id: 'lead', label: 'Lead' }, { id: 'qualified', label: 'Kvalifikováno' }, { id: 'proposal', label: 'Nabídka' },
  { id: 'negotiation', label: 'Jednání' }, { id: 'won', label: 'Vyhráno' }, { id: 'lost', label: 'Prohráno' },
]

function BarRow({ label, value, max, hint, color }: { label: string; value: number; max: number; hint: string; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{hint}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color || 'var(--chart-1)' }} />
      </div>
    </div>
  )
}

export default async function ReportsPage() {
  const { supabase, tenantId, allowedModules } = await requireModuleAccess('reports')
  if (!tenantId) return <NoTenantView />

  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const hasFinance = allowedModules.includes('finance') || allowedModules.includes('invoices')

  const [invRes, txRes, catRes, dealRes, quoteRes, timeRes] = await Promise.all([
    supabase.from('invoices').select('amount, status, type, issue_date, client_name').eq('tenant_id', tenantId).gte('issue_date', yearStart),
    supabase.from('transactions').select('amount, type, date, category_id').eq('tenant_id', tenantId).gte('date', yearStart),
    supabase.from('transaction_categories').select('id, name, color').eq('tenant_id', tenantId),
    allowedModules.includes('crm') ? supabase.from('crm_deals').select('value, stage').eq('tenant_id', tenantId) : Promise.resolve({ data: [] as any[] }),
    allowedModules.includes('quotes') ? supabase.from('quotes').select('status, total').eq('tenant_id', tenantId) : Promise.resolve({ data: [] as any[] }),
    allowedModules.includes('time') ? supabase.from('time_entries').select('minutes, billable, hourly_rate, work_date').eq('tenant_id', tenantId).gte('work_date', yearStart) : Promise.resolve({ data: [] as any[] }),
  ])

  const invoices = invRes.data ?? []
  const transactions = txRes.data ?? []
  const categories = catRes.data ?? []
  const deals = dealRes.data ?? []
  const quotes = quoteRes.data ?? []
  const timeEntries = timeRes.data ?? []

  const revenue = invoices.filter((i: any) => i.type === 'issued' && i.status === 'paid').reduce((a: number, i: any) => a + Number(i.amount || 0), 0)
  const costs = invoices.filter((i: any) => i.type === 'received' && i.status === 'paid').reduce((a: number, i: any) => a + Number(i.amount || 0), 0)
  const profit = revenue - costs

  // Náklady dle kategorie (výdajové transakce)
  const catName = (id: string | null) => categories.find((c: any) => c.id === id)?.name || 'Bez kategorie'
  const catColor = (id: string | null) => categories.find((c: any) => c.id === id)?.color || undefined
  const expenseByCat = new Map<string, { name: string; value: number; color?: string }>()
  for (const t of transactions.filter((t: any) => t.type === 'expense')) {
    const key = t.category_id || 'none'
    const cur = expenseByCat.get(key) || { name: catName(t.category_id), value: 0, color: catColor(t.category_id) }
    cur.value += Number(t.amount || 0)
    expenseByCat.set(key, cur)
  }
  const expenseCats = [...expenseByCat.values()].sort((a, b) => b.value - a.value).slice(0, 8)
  const expenseMax = Math.max(1, ...expenseCats.map((c) => c.value))

  // Tržby dle klienta (uhrazené vydané faktury)
  const revByClient = new Map<string, number>()
  for (const i of invoices.filter((i: any) => i.type === 'issued' && i.status === 'paid')) {
    const key = i.client_name || '—'
    revByClient.set(key, (revByClient.get(key) || 0) + Number(i.amount || 0))
  }
  const topClients = [...revByClient.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  const clientMax = Math.max(1, ...topClients.map((c) => c.value))

  // Obchodní funnel
  const funnel = DEAL_STAGES.map((s) => {
    const list = deals.filter((d: any) => d.stage === s.id)
    return { ...s, count: list.length, value: list.reduce((a: number, d: any) => a + Number(d.value || 0), 0) }
  })
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count))

  // Nabídky
  const acceptedQuotes = quotes.filter((q: any) => q.status === 'accepted')
  const openQuotesValue = quotes.filter((q: any) => q.status === 'draft' || q.status === 'sent').reduce((a: number, q: any) => a + Number(q.total || 0), 0)
  const acceptedValue = acceptedQuotes.reduce((a: number, q: any) => a + Number(q.total || 0), 0)

  // Výkazy
  const billableMin = timeEntries.filter((t: any) => t.billable).reduce((a: number, t: any) => a + (t.minutes || 0), 0)
  const timeValue = timeEntries.filter((t: any) => t.billable && t.hourly_rate).reduce((a: number, t: any) => a + (t.minutes / 60) * Number(t.hourly_rate), 0)

  // Cross-module ops snapshot (exec)
  const todayIso = new Date().toISOString().slice(0, 10)
  const [evRes, socRes, staffRes] = await Promise.all([
    allowedModules.includes('events') ? supabase.from('events').select('name, event_date, status').eq('tenant_id', tenantId).gte('event_date', todayIso).order('event_date', { ascending: true }).limit(5) : Promise.resolve({ data: [] as any[] }),
    allowedModules.includes('social') ? supabase.from('social_accounts').select('followers').eq('tenant_id', tenantId) : Promise.resolve({ data: [] as any[] }),
    allowedModules.includes('hr') ? supabase.from('hr_employees').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active') : Promise.resolve({ count: 0 }),
  ])
  const upcomingEvents = evRes.data ?? []
  const followers = (socRes.data ?? []).reduce((a: number, s: any) => a + Number(s.followers || 0), 0)
  const staffCount = (staffRes as any).count || 0
  const hasOps = allowedModules.includes('events') || allowedModules.includes('social') || allowedModules.includes('hr')

  return (
    <div className="space-y-6">
      <PageHeader title="Reporty" description={`Analýzy a souhrny za rok ${year}.`} />

      {hasOps && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {allowedModules.includes('events') && <StatCard title="Nadcházející akce" value={String(upcomingEvents.length)} hint={upcomingEvents[0] ? `Nejbližší: ${upcomingEvents[0].name}` : 'Žádné naplánované'} icon={<TrendingUp className="size-4" />} />}
          {allowedModules.includes('social') && <StatCard title="Sledující na sítích" value={new Intl.NumberFormat('cs-CZ').format(followers)} hint="Napříč připojenými profily" icon={<TrendingUp className="size-4" />} />}
          {allowedModules.includes('hr') && <StatCard title="Aktivní tým" value={String(staffCount)} hint="Aktivní zaměstnanci" icon={<TrendingUp className="size-4" />} />}
        </div>
      )}

      {hasFinance && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Tržby (rok)" value={czk(revenue)} tone="positive" hint="Uhrazené vydané faktury" icon={<ArrowUpRight className="size-4" />} />
          <StatCard title="Náklady (rok)" value={czk(costs)} tone="negative" hint="Uhrazené přijaté faktury" icon={<ArrowDownLeft className="size-4" />} />
          <StatCard title="Zisk (rok)" value={czk(profit)} tone={profit >= 0 ? 'positive' : 'negative'} hint="Tržby − náklady" icon={<TrendingUp className="size-4" />} />
          <StatCard title="Přijaté nabídky" value={czk(acceptedValue)} hint={`${acceptedQuotes.length} nabídek`} icon={<Receipt className="size-4" />} />
        </div>
      )}

      {hasFinance && (
        <Card>
          <CardHeader><CardTitle>Cash-flow ({year})</CardTitle><CardDescription>Kumulativní zůstatek dle transakcí</CardDescription></CardHeader>
          <CardContent><CashflowChart data={transactions} /></CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {hasFinance && (
          <Card>
            <CardHeader><CardTitle>Náklady dle kategorie</CardTitle><CardDescription>Výdaje za rok {year}</CardDescription></CardHeader>
            <CardContent>
              {expenseCats.length === 0 ? <EmptyState icon={BarChart3} title="Žádné výdaje" /> : (
                <div className="space-y-3">{expenseCats.map((c, i) => <BarRow key={i} label={c.name} value={c.value} max={expenseMax} hint={czk(c.value)} color={c.color} />)}</div>
              )}
            </CardContent>
          </Card>
        )}

        {hasFinance && (
          <Card>
            <CardHeader><CardTitle>Tržby dle klienta</CardTitle><CardDescription>Top klienti (uhrazené faktury)</CardDescription></CardHeader>
            <CardContent>
              {topClients.length === 0 ? <EmptyState icon={BarChart3} title="Žádné tržby" /> : (
                <div className="space-y-3">{topClients.map((c, i) => <BarRow key={i} label={c.name} value={c.value} max={clientMax} hint={czk(c.value)} />)}</div>
              )}
            </CardContent>
          </Card>
        )}

        {allowedModules.includes('crm') && (
          <Card>
            <CardHeader><CardTitle>Obchodní funnel</CardTitle><CardDescription>Příležitosti dle fáze</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">{funnel.map((f) => <BarRow key={f.id} label={f.label} value={f.count} max={funnelMax} hint={`${f.count} · ${czk(f.value)}`} />)}</div>
            </CardContent>
          </Card>
        )}

        {(allowedModules.includes('time') || allowedModules.includes('quotes')) && (
          <Card>
            <CardHeader><CardTitle>Provoz</CardTitle><CardDescription>Výkazy a nabídky</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {allowedModules.includes('time') && <>
                  <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Fakturovatelné hodiny</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{(billableMin / 60).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} h</div></div>
                  <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Hodnota výkazů</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{czk(timeValue)}</div></div>
                </>}
                {allowedModules.includes('quotes') && <>
                  <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Otevřené nabídky</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{czk(openQuotesValue)}</div></div>
                  <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Přijaté nabídky</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{acceptedQuotes.length}</div></div>
                </>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
