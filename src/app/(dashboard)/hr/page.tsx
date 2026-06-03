import { requireModuleAccess } from '@/lib/supabase/tenant'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Users, Plane, Clock, Briefcase, FileSignature, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default async function HrOverviewPage() {
  const { supabase, tenantId } = await requireModuleAccess('hr')
  if (!tenantId) return null

  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const yearStart = `${new Date().getFullYear()}-01-01`

  const [emp, pendingLeave, openJobs, outToday, expiringRes, dppRes, trainRes] = await Promise.all([
    supabase.from('hr_employees').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    supabase.from('hr_leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
    supabase.from('hr_job_postings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'open'),
    supabase.from('hr_leave_requests').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'approved').lte('start_date', today).gte('end_date', today),
    supabase.from('hr_contracts').select('id, user_id, title, type, end_date').eq('tenant_id', tenantId).eq('status', 'active').not('end_date', 'is', null).gte('end_date', today).lte('end_date', in30).order('end_date'),
    supabase.from('hr_employees').select('user_id').eq('tenant_id', tenantId).eq('employment_type', 'dpp'),
    supabase.from('hr_trainings').select('user_id, name, expires_on').eq('tenant_id', tenantId).not('expires_on', 'is', null).gte('expires_on', today).lte('expires_on', in30).order('expires_on'),
  ])

  const expiring = expiringRes.data ?? []
  const trainExp = trainRes.data ?? []
  const dppIds = (dppRes.data ?? []).map((e: any) => e.user_id)
  let dppWarn: { user_id: string; hours: number }[] = []
  if (dppIds.length) {
    const { data: att } = await supabase.from('hr_attendance').select('user_id, clock_in, clock_out').eq('tenant_id', tenantId).in('user_id', dppIds).gte('work_date', yearStart)
    const hours: Record<string, number> = {}
    for (const a of att ?? []) {
      if (a.clock_in && a.clock_out) hours[a.user_id] = (hours[a.user_id] || 0) + (new Date(a.clock_out).getTime() - new Date(a.clock_in).getTime()) / 3600000
    }
    dppWarn = Object.entries(hours).filter(([, h]) => h >= 270).map(([user_id, h]) => ({ user_id, hours: Math.round(h) }))
  }

  const ids = Array.from(new Set([...expiring.map((c: any) => c.user_id), ...dppWarn.map((d) => d.user_id), ...trainExp.map((t: any) => t.user_id)]))
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string) => { const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || id.slice(0, 8) }
  const hasIssues = expiring.length > 0 || dppWarn.length > 0 || trainExp.length > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aktivní zaměstnanci" value={String(emp.count || 0)} hint="Správa personálu" icon={<Users className="size-4" />} />
        <StatCard title="Dnes mimo" value={String(outToday.count || 0)} hint="Schválená dovolená/absence" icon={<Plane className="size-4" />} />
        <StatCard title="Čekající žádosti" value={String(pendingLeave.count || 0)} hint="Ke schválení" icon={<Clock className="size-4" />} />
        <StatCard title="Otevřené pozice" value={String(openJobs.count || 0)} hint="Nábor" icon={<Briefcase className="size-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSignature className="size-4" />Compliance</CardTitle>
          <CardDescription>Blížící se expirace smluv a limity dohod (DPP)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!hasIssues && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-success" />Vše v pořádku — žádné blížící se expirace ani překročené limity.</div>
          )}
          {expiring.map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <span className="font-medium text-foreground">{nameOf(c.user_id)}</span>
              <span className="text-muted-foreground">— {c.title || 'Smlouva'} vyprší {new Date(c.end_date).toLocaleDateString('cs-CZ')}</span>
            </div>
          ))}
          {dppWarn.map((d) => (
            <div key={d.user_id} className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <span className="font-medium text-foreground">{nameOf(d.user_id)}</span>
              <span className="text-muted-foreground">— DPP: {d.hours} h / 300 h za rok (blíží se limitu)</span>
            </div>
          ))}
          {trainExp.map((t: any) => (
            <div key={String(t.user_id) + t.name + t.expires_on} className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <span className="font-medium text-foreground">{nameOf(t.user_id)}</span>
              <span className="text-muted-foreground">— certifikace „{t.name}" platí do {new Date(t.expires_on).toLocaleDateString('cs-CZ')}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
