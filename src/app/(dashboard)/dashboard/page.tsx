import Link from 'next/link'
import { requireModuleAccess } from '@/lib/supabase/tenant'
import { getUctoSummary } from '@/lib/ucto'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Landmark, Users, ArrowDownLeft, ArrowUpRight, TrendingUp, FileText, FolderKanban, Percent, Unplug } from 'lucide-react'
import { CashflowChart } from '../finance/cashflow-chart'

const czk = (n: number) =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(n)

const TF_LABELS = [{ key: 'week', label: 'Týden' }, { key: 'month', label: 'Měsíc' }, { key: 'year', label: 'Rok' }]

// Dashboard: finanční čísla jdou VÝHRADNĚ z účetního systému (ucto), provozní
// data (cíle, projekty, tým) z work. Jen hlavní ukazatele — žádný balast.
export default async function DashboardPage() {
  const { supabase, tenantId, allowedModules } = await requireModuleAccess('dashboard')
  if (!tenantId) return <NoTenantView />

  const [ucto, teamResult] = await Promise.all([
    getUctoSummary(),
    supabase.from('tenant_users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])
  const teamCount = teamResult.count || 0

  const showGoals = allowedModules.includes('milestones')
  const { data: milestones } = showGoals
    ? await supabase.from('milestones').select('timeframe, progress').eq('tenant_id', tenantId).eq('archived', false)
    : { data: [] as any[] }
  const goalSummary = TF_LABELS.map((t) => {
    const items = (milestones || []).filter((m: any) => m.timeframe === t.key)
    const avg = items.length ? Math.round(items.reduce((s: number, m: any) => s + (m.progress || 0), 0) / items.length) : 0
    return { ...t, count: items.length, avg }
  })

  const showProjects = allowedModules.includes('projects')
  const { data: activeProjects } = showProjects
    ? await supabase.from('projects').select('id, name, status').eq('tenant_id', tenantId).in('status', ['planning', 'active', 'on_hold']).order('created_at', { ascending: false }).limit(6)
    : { data: [] as any[] }
  const activeProjectIds = (activeProjects || []).map((p: any) => p.id)
  const { data: activeProjectTasks } = showProjects && activeProjectIds.length
    ? await supabase.from('project_tasks').select('project_id, status').in('project_id', activeProjectIds)
    : { data: [] as any[] }
  const projectsSummary = (activeProjects || []).map((p: any) => {
    const t = (activeProjectTasks || []).filter((x: any) => x.project_id === p.id)
    const d = t.filter((x: any) => x.status === 'done').length
    return { id: p.id, name: p.name, total: t.length, done: d, pct: t.length ? Math.round((d / t.length) * 100) : 0 }
  })

  // Bankovní pohyby účta → tvar pro CashflowChart ({date, type, amount}).
  const chartData = ucto.connected
    ? ucto.months.flatMap((m) => [
        { date: `${m.month}-01`, type: 'income', amount: m.inflow },
        { date: `${m.month}-01`, type: 'expense', amount: m.outflow },
      ]).filter((r) => r.amount > 0)
    : []

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Přehled</h1>
        <p className="text-sm text-muted-foreground">Finanční data z účetnictví · provoz z work.</p>
      </div>

      {!ucto.connected && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <Unplug className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <div className="font-medium text-foreground">Účetnictví není připojeno</div>
            <div className="text-muted-foreground">{ucto.reason}</div>
          </div>
        </div>
      )}

      {ucto.connected && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Stav banky" value={czk(ucto.bankBalance)} tone={ucto.bankBalance >= 0 ? 'neutral' : 'negative'} hint="Z bankovních pohybů (účto)" icon={<Landmark className="size-4" />} />
            <StatCard title="Tržby (rok)" value={czk(ucto.revenueYtd)} tone="positive" hint="Vydané faktury + pokladna" icon={<ArrowUpRight className="size-4" />} />
            <StatCard title="Náklady (rok)" value={czk(ucto.costsYtd)} tone="negative" hint="Přijaté faktury + pokladna" icon={<ArrowDownLeft className="size-4" />} />
            <StatCard title="Zisk (rok)" value={czk(ucto.profitYtd)} tone={ucto.profitYtd >= 0 ? 'positive' : 'negative'} hint="Tržby − náklady" icon={<TrendingUp className="size-4" />} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Pohledávky" value={czk(ucto.receivables)} hint={`${ucto.receivablesCount} neuhrazených vydaných`} icon={<FileText className="size-4" />} />
            <StatCard title="Závazky" value={czk(ucto.payables)} tone={ucto.payables > 0 ? 'negative' : 'neutral'} hint={`${ucto.payablesCount} neuhrazených přijatých`} icon={<FileText className="size-4" />} />
            {ucto.isVatPayer ? (
              <StatCard title="DPH k odvodu (Q)" value={czk(ucto.vatDueQuarter || 0)} hint="Běžné čtvrtletí" icon={<Percent className="size-4" />} />
            ) : (
              <StatCard title="Obrat 12 měsíců" value={czk(ucto.obrat12m || 0)} hint={`Do limitu DPH zbývá ${czk(ucto.zbyvaDoLimitu || 0)}`} icon={<Percent className="size-4" />} />
            )}
            <StatCard title="Aktivní tým" value={String(teamCount)} hint="Členové organizace" icon={<Users className="size-4" />} />
          </div>
        </>
      )}

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

      {showProjects && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Aktivní projekty</CardTitle>
              <CardDescription>Rozpracované zakázky a jejich průběh</CardDescription>
            </div>
            <Link href="/projects/board" className="text-sm font-medium text-primary hover:underline">Otevřít →</Link>
          </CardHeader>
          <CardContent>
            {projectsSummary.length === 0 ? (
              <EmptyState icon={FolderKanban} title="Žádné aktivní projekty" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projectsSummary.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{p.done}/{p.total}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.pct}%` }} /></div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {ucto.connected && chartData.length > 0 && (
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
    </div>
  )
}
