import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { HrContractsClient } from './contracts-client'

export default async function HrContractsPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)

  const [{ data: tenantUsers }, { data: contracts }] = await Promise.all([
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('hr_contracts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', ids)
    : { data: [] as any[] }
  const nameOf = (id: string) => {
    const p = (profiles ?? []).find((x: any) => x.id === id)
    return p?.full_name || p?.username || id.slice(0, 8)
  }
  const people = ids.map((id: string) => ({ user_id: id, name: nameOf(id) }))
  const all = (contracts ?? []).map((ct: any) => ({ ...ct, name: nameOf(ct.user_id) }))
  const visible = canManage ? all : all.filter((ct: any) => ct.user_id === user.id)

  return <HrContractsClient contracts={visible} people={people} canManage={canManage} isAdmin={role === 'admin'} currentUserId={user.id} />
}
