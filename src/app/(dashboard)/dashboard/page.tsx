import Link from 'next/link'
import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { DollarSign, FileText, Users, Calendar, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'
import { CashflowChart } from '../finance/cashflow-chart'

const czk = (n: number) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(n)

const TF_LABELS = [{ key: 'week', label: 'Týden' }, { key: 'month', label: 'Měsíc' }, { key: 'year', label: 'Rok' }]

export default async function DashboardPage() {
  const { supabase, tenantId, allowedModules } = await requireModuleAccess('dashboard')
  if (!tenantId) return <NoTenantView />

  const showGoals = allowedModules.includes('milestones')
  const { data: milestones } = showGoals
    ? await supabase.from('milestones').select('timeframe, progress').eq('tenant_id', tenantId).eq('archived', false)
    : { data: [] as any[] }
  const goalSummary = TF_LABELS.map((t) => {
    const items = (milestones || []).filter((m: any) => m.timeframe === t.key)
    const avg = items.length ? Math.round(items.reduce((s: number, m: any) => s + (m.progress || 0), 0) / items.length) : 0
    return { ...t, count: items.length, avg }
  })

  const [teamResult, invoicesResult, upcomingTasksResult, transactionsResult] = await Promise.all([
    supabase.from('tenant_users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('invoices').select('amount, status, type').eq('tenant_id', tenantId),
    supabase.from('calendar_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('start_time', new Date().toISOString()),
    supabase.from('transactions').select('amount, type, date, description, created_at').eq('tenant_id', tenantId).order('date', { ascending: true }),
  ])

  const teamCount = teamResult.count || 0
  const invoices = invoicesResult.data || []
  const upcomingTasks = upcomingTasksResult.count || 0
  const transactions = transactionsResult.data || []

  const unpaidInvoices = invoices.filter((i: any) => i.status === 'pending' || i.status === 'overdue').length
  const issued = invoices.filter((i: any) => i.type === 'issued')
  const received = invoices.filter((i: any) => i.type === 'received')
  const revenue = issued.filter((i: any) => i.status === 'paid').reduce((a: number, i: any) => a + Number(i.amount || 0), 0)
  const receivables = issued.filter((i: any) => i.status === 'pending' || i.status === 'overdue').reduce((a: number, i: any) => a + Number(i.amount || 0), 0)
  const payables = received.filter((i: any) => i.status === 'pending' || i.status === 'overdue').reduce((a: number, i: any) => a + Number(i.amount || 0), 0)
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0)
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0)
  const balance = totalIncome - totalExpense
  const recent = [...transactions]
    .sort((a: any, b: any) =>
      a.date === b.date
        ? String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
        : (a.date < b.date ? 1 : -1)
    )
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Přehled</h1>
        <p className="text-sm text-muted-foreground">Souhrn klíčových ukazatelů vaší organizace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Zůstatek cash-flow" value={czk(balance)} hint="Dle aktuálních transakcí" tone={balance >= 0 ? 'neutral' : 'negative'} icon={<DollarSign className="size-4" />} />
        <StatCard title="Nezaplacené faktury" value={String(unpaidInvoices)} hint={unpaidInvoices === 0 ? 'Vše uhrazeno' : 'Vyžaduje pozornost'} icon={<FileText className="size-4" />} />
        <StatCard title="Aktivní zaměstnanci" value={String(teamCount)} hint="Správa týmu" icon={<Users className="size-4" />} />
        <StatCard title="Nadcházející úkoly" value={String(upcomingTasks)} hint="V kalendáři" icon={<Calendar className="size-4" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Tržby (uhrazené faktury)" value={czk(revenue)} tone="positive" hint="Vydané a uhrazené" icon={<ArrowUpRight className="size-4" />} />
        <StatCard title="Pohledávky" value={czk(receivables)} hint="Neuhrazené vydané faktury" icon={<FileText className="size-4" />} />
        <StatCard title="Závazky" value={czk(payables)} tone="negative" hint="Neuhrazené přijaté faktury" icon={<ArrowDownLeft className="size-4" />} />
      </div>

      {showGoals && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Firemní cíle</CardTitle>
              <CardDescription>Pokrok podle období</CardDescription>
            </div>
            <Link href="/milestones" className="text-sm font-medium text-primary hover:underline">Otevřít →</Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {goalSummary.map((g) => (
                <div key={g.key} className="rounded-lg border border-border p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-foreground">{g.label}</span>
                    <span className="text-lg font-semibold tabular-nums text-foreground">{g.avg}&nbsp;%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${g.avg}%` }} />
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{g.count ? `${g.count} ${g.count === 1 ? 'cíl' : g.count <= 4 ? 'cíle' : 'cílů'}` : 'Žádné cíle'}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Cash-flow přehled</CardTitle>
            <CardDescription>Vývoj kumulativního zůstatku v čase</CardDescription>
          </CardHeader>
          <CardContent>
            <CashflowChart data={transactions} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Poslední transakce</CardTitle>
            <CardDescription>Nejnovější pohyby na účtu</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={Activity} title="Zatím žádné transakce" />
            ) : (
              <div className="divide-y divide-border">
                {recent.map((t: any, i: number) => {
                  const income = t.type === 'income'
                  return (
                    <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${income ? 'bg-success/12 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {income ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{t.description || (income ? 'Příjem' : 'Výdaj')}</div>
                        <div className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('cs-CZ')}</div>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold tabular-nums ${income ? 'text-success' : 'text-destructive'}`}>
                        {income ? '+' : '−'}{czk(Number(t.amount))}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
