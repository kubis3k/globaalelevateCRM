import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Users, UserMinus, Plane, Wallet } from 'lucide-react'

const czk = (n: number) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n) || 0)
const EMP_TYPE: Record<string, string> = { full_time: 'HPP', part_time: 'Částečný', dpp: 'DPP', dpc: 'DPČ', contract: 'IČO', intern: 'Stáž' }

function Bar({ label, value, max, hint }: { label: string; value: number; max: number; hint: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm"><span className="text-foreground">{label}</span><span className="tabular-nums text-muted-foreground">{hint}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default async function HrAnalyticsPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  if (!canManageHr(role)) return <p className="text-sm text-muted-foreground">Analýzy jsou pro management.</p>

  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [{ data: emps }, { data: leave }, { data: contracts }, { data: trainings }, { data: shifts }] = await Promise.all([
    supabase.from('hr_employees').select('user_id, employment_type, status, salary, end_date, hourly_rate').eq('tenant_id', tenantId),
    supabase.from('hr_leave_requests').select('type, status, working_days, start_date').eq('tenant_id', tenantId).gte('start_date', yearStart),
    supabase.from('hr_contracts').select('status, end_date').eq('tenant_id', tenantId),
    supabase.from('hr_trainings').select('expires_on').eq('tenant_id', tenantId),
    supabase.from('hr_shifts').select('id, start_time, end_time').eq('tenant_id', tenantId).gte('work_date', today).lte('work_date', in7),
  ])

  const active = (emps ?? []).filter((e: any) => e.status === 'active')
  const terminatedYear = (emps ?? []).filter((e: any) => e.status === 'terminated' && e.end_date && e.end_date >= yearStart).length
  const byType = new Map<string, number>()
  for (const e of active) byType.set(e.employment_type, (byType.get(e.employment_type) || 0) + 1)
  const typeRows = [...byType.entries()].map(([k, v]) => ({ label: EMP_TYPE[k] || k, value: v })).sort((a, b) => b.value - a.value)
  const typeMax = Math.max(1, ...typeRows.map((r) => r.value))

  const leaveUsed = (leave ?? []).filter((l: any) => l.type === 'vacation' && l.status === 'approved').reduce((a: number, l: any) => a + Number(l.working_days || 0), 0)
  const monthlyGross = active.reduce((a: number, e: any) => a + Number(e.salary || 0), 0)
  const contractsActive = (contracts ?? []).filter((c: any) => c.status === 'active').length
  const contractsExpiring = (contracts ?? []).filter((c: any) => c.status === 'active' && c.end_date && c.end_date >= today && c.end_date <= in30).length
  const trainExpiring = (trainings ?? []).filter((t: any) => t.expires_on && t.expires_on >= today && t.expires_on <= in30).length
  const trainExpired = (trainings ?? []).filter((t: any) => t.expires_on && t.expires_on < today).length

  // labor cost of shifts in the next 7 days (hours × hourly_rate of assignees)
  const shiftIds = (shifts ?? []).map((s: any) => s.id)
  let weekShiftCost = 0
  if (shiftIds.length) {
    const { data: assigns } = await supabase.from('hr_shift_assignments').select('shift_id, user_id, status').in('shift_id', shiftIds).neq('status', 'declined')
    const rate = (uid: string) => Number((emps ?? []).find((e: any) => e.user_id === uid)?.hourly_rate || 0)
    const hours = (s: any) => { if (!s.start_time || !s.end_time) return 0; const p = (t: any) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0) }; let mins = p(s.end_time) - p(s.start_time); if (mins < 0) mins += 1440; return mins / 60 }
    for (const s of shifts ?? []) {
      const h = hours(s)
      for (const a of (assigns ?? []).filter((x: any) => x.shift_id === s.id)) weekShiftCost += h * rate(a.user_id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aktivní zaměstnanci" value={String(active.length)} hint={`${typeRows.map((r) => `${r.value} ${r.label}`).join(' · ') || '—'}`} icon={<Users className="size-4" />} />
        <StatCard title="Odchody (letos)" value={String(terminatedYear)} hint="Fluktuace v tomto roce" icon={<UserMinus className="size-4" />} />
        <StatCard title="Čerpaná dovolená" value={`${leaveUsed.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} dní`} hint={`Schválená dovolená ${year}`} icon={<Plane className="size-4" />} />
        <StatCard title="Měsíční hrubé mzdy" value={czk(monthlyGross)} hint="Součet mezd aktivních zaměstnanců" icon={<Wallet className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Struktura úvazků</CardTitle><CardDescription>Aktivní zaměstnanci dle typu</CardDescription></CardHeader>
          <CardContent>
            {typeRows.length === 0 ? <p className="text-sm text-muted-foreground">Žádní aktivní zaměstnanci.</p> : <div className="space-y-3">{typeRows.map((r, i) => <Bar key={i} label={r.label} value={r.value} max={typeMax} hint={`${r.value}`} />)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Provoz & compliance</CardTitle><CardDescription>Smlouvy, certifikace, náklady směn</CardDescription></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Aktivní smlouvy</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{contractsActive}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Smlouvy do 30 dní</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{contractsExpiring}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Certifikace do 30 dní</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{trainExpiring}{trainExpired ? ` (+${trainExpired} propadlé)` : ''}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Náklady směn (7 dní)</div><div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{czk(weekShiftCost)}</div></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
