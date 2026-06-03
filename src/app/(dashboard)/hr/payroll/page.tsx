import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { DEFAULT_PAYROLL_CONFIG } from '@/lib/payroll-cz'
import { HrPayrollClient } from './payroll-client'

export default async function HrPayrollPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  if (!canManageHr(role)) return <p className="text-sm text-muted-foreground">Mzdy spravuje management (admin / manažer).</p>

  const year = new Date().getFullYear()
  const [{ data: runs }, { data: cfg }, { data: tenantUsers }] = await Promise.all([
    supabase.from('payroll_runs').select('*').eq('tenant_id', tenantId).order('year', { ascending: false }).order('month', { ascending: false }),
    supabase.from('payroll_config').select('*').eq('tenant_id', tenantId).eq('year', year).maybeSingle(),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
  ])

  const runIds = (runs ?? []).map((r: any) => r.id)
  const { data: items } = runIds.length
    ? await supabase.from('payroll_items').select('*').in('run_id', runIds)
    : { data: [] as any[] }

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string) => { const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || id.slice(0, 8) }

  const runsFull = (runs ?? []).map((r: any) => ({
    ...r,
    items: (items ?? []).filter((i: any) => i.run_id === r.id).map((it: any) => ({ ...it, name: nameOf(it.user_id) })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
  }))

  return <HrPayrollClient runs={runsFull} config={cfg || null} defaults={DEFAULT_PAYROLL_CONFIG} year={year} isAdmin={role === 'admin'} />
}
