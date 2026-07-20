import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Receipt, BarChart3, Magnet, PhoneCall, ArrowRight, Users } from 'lucide-react'
import { CashflowChart } from '../finance/cashflow-chart'
import { ProspectsWeeklyChart } from './prospects-weekly-chart'

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

  // ── Akvizice (jen s přístupem k modulu prospects) ────────────────────────
  const hasProspects = allowedModules.includes('prospects')
  const PROSPECT_SRC = [
    { key: 'maps', label: 'Mapy', color: 'var(--chart-1)' },
    { key: 'firmy', label: 'Firmy.cz', color: 'var(--chart-2)' },
    { key: 'rejstrik', label: 'Rejstřík', color: 'var(--chart-3)' },
    { key: 'referral', label: 'Doporučení', color: 'var(--chart-4)' },
    { key: 'ig', label: 'Instagram', color: 'var(--chart-5)' },
    { key: 'osobni', label: 'Osobní', color: '#f59e0b' },
    { key: 'jine', label: 'Jiné', color: '#94a3b8' },
  ]
  let prosp: any = null
  if (hasProspects) {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const [pRes, tRes] = await Promise.all([
      supabase.from('crm_prospects').select('id, source, status, owner, converted_client_id, created_at, updated_at').eq('tenant_id', tenantId).gte('created_at', yearStart),
      supabase.from('crm_prospect_touches').select('prospect_id, outcome, created_by, created_at').eq('tenant_id', tenantId).gte('created_at', yearStart),
    ])
    const ps = pRes.data ?? []
    const ts = tRes.data ?? []
    const isConv = (p: any) => p.status === 'converted' || !!p.converted_client_id

    const repliedSet = new Set(ts.filter((t: any) => t.outcome === 'replied' || t.outcome === 'meeting').map((t: any) => t.prospect_id))

    // Průměrný počet doteků do první odpovědi
    const byProspect = new Map<string, any[]>()
    for (const t of ts) { const a = byProspect.get(t.prospect_id) || []; a.push(t); byProspect.set(t.prospect_id, a) }
    let sumTouches = 0, repliedProspects = 0
    for (const [, list] of byProspect) {
      const sorted = [...list].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      const idx = sorted.findIndex((t) => t.outcome === 'replied' || t.outcome === 'meeting')
      if (idx >= 0) { sumTouches += idx + 1; repliedProspects++ }
    }

    const convertedCount = ps.filter(isConv).length
    const sourceRows = PROSPECT_SRC.map((s) => {
      const list = ps.filter((p: any) => p.source === s.key)
      const count = list.length
      const replied = list.filter((p: any) => repliedSet.has(p.id)).length
      const converted = list.filter(isConv).length
      return { key: s.key, label: s.label, count, repliedPct: count ? Math.round((replied / count) * 100) : 0, convertedPct: count ? Math.round((converted / count) * 100) : 0 }
    }).filter((r) => r.count > 0).sort((a, b) => b.count - a.count)

    // Noví po týdnech (12 týdnů) dle zdroje
    const weeks: any[] = []
    for (let i = 11; i >= 0; i--) {
      const end = new Date(Date.now() - i * 7 * 86400000)
      const start = new Date(Date.now() - (i + 1) * 7 * 86400000)
      const row: any = { week: end.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }), _s: start.toISOString(), _e: end.toISOString() }
      PROSPECT_SRC.forEach((s) => (row[s.key] = 0))
      weeks.push(row)
    }
    for (const p of ps) {
      for (const w of weeks) { if (p.created_at > w._s && p.created_at <= w._e) { w[p.source] = (w[p.source] || 0) + 1; break } }
    }

    // Leaderboard 30 dní
    const touchByUser = new Map<string, number>()
    for (const t of ts) { if (t.created_at >= monthAgo && t.created_by) touchByUser.set(t.created_by, (touchByUser.get(t.created_by) || 0) + 1) }
    const convByUser = new Map<string, number>()
    for (const p of ps) { if (isConv(p) && p.owner && (p.updated_at || '') >= monthAgo) convByUser.set(p.owner, (convByUser.get(p.owner) || 0) + 1) }
    const leaderIds = [...new Set([...touchByUser.keys(), ...convByUser.keys()])]
    const { data: leaderProfiles } = leaderIds.length ? await supabase.from('profiles').select('id, username, full_name').in('id', leaderIds) : { data: [] as any[] }
    const nameOf = (id: string) => { const p = (leaderProfiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || id.slice(0, 8) }
    const leaderboard = leaderIds.map((id) => ({ id, name: nameOf(id), touches: touchByUser.get(id) || 0, conv: convByUser.get(id) || 0 }))
      .sort((a, b) => b.touches - a.touches || b.conv - a.conv).slice(0, 8)

    prosp = {
      newProspects: ps.length, totalTouches: ts.length, convertedCount,
      conversionRate: ps.length ? Math.round((convertedCount / ps.length) * 100) : 0,
      avgToReply: repliedProspects ? sumTouches / repliedProspects : 0,
      sourceRows, weeks, leaderboard, series: PROSPECT_SRC,
    }
  }

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

      {hasProspects && prosp && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Akvizice</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Noví prospekti" value={String(prosp.newProspects)} hint={`Za rok ${year}`} icon={<Magnet className="size-4" />} />
            <StatCard title="Doteků celkem" value={String(prosp.totalTouches)} hint="Oslovení a follow-upy" icon={<PhoneCall className="size-4" />} />
            <StatCard title="Konverze" value={`${prosp.conversionRate} %`} tone="positive" hint={`${prosp.convertedCount} → klient`} icon={<ArrowRight className="size-4" />} />
            <StatCard title="Doteků do odpovědi" value={prosp.avgToReply.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} hint="Průměr" icon={<TrendingUp className="size-4" />} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Noví prospekti po týdnech</CardTitle><CardDescription>Posledních 12 týdnů dle zdroje</CardDescription></CardHeader>
              <CardContent><ProspectsWeeklyChart data={prosp.weeks} series={prosp.series} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Výtěžnost zdrojů</CardTitle><CardDescription>Který kanál živit</CardDescription></CardHeader>
              <CardContent>
                {prosp.sourceRows.length === 0 ? <EmptyState icon={BarChart3} title="Žádní prospekti" /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2 font-medium">Zdroj</th><th className="pb-2 text-right font-medium">Počet</th><th className="pb-2 text-right font-medium">% odpovědí</th><th className="pb-2 text-right font-medium">% konverzí</th></tr></thead>
                      <tbody>
                        {prosp.sourceRows.map((r: any) => (
                          <tr key={r.key} className="border-t border-border">
                            <td className="py-1.5 text-foreground">{r.label}</td>
                            <td className="py-1.5 text-right tabular-nums text-foreground">{r.count}</td>
                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.repliedPct} %</td>
                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.convertedPct} %</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Leaderboard akvizice</CardTitle><CardDescription>Doteky a konverze za posledních 30 dní</CardDescription></CardHeader>
            <CardContent>
              {prosp.leaderboard.length === 0 ? <EmptyState icon={Users} title="Žádná aktivita" /> : (
                <div className="space-y-2">
                  {prosp.leaderboard.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">{l.name}</span>
                      <span className="text-muted-foreground">{l.touches} doteků · <span className="text-foreground">{l.conv} konverzí</span></span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
