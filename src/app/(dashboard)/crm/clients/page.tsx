import { requireModuleAccess } from '@/lib/supabase/tenant'
import { ClientsClient } from './clients-client'

export default async function CrmClientsPage() {
  const { supabase, tenantId } = await requireModuleAccess('crm')
  if (!tenantId) return null

  const [{ data: clients }, { data: tenantUsers }] = await Promise.all([
    supabase.from('crm_clients').select('*').eq('tenant_id', tenantId).order('name'),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
  ])
  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string | null) => {
    if (!id) return null
    const p = (profiles ?? []).find((x: any) => x.id === id)
    return p?.full_name || p?.username || id.slice(0, 8)
  }
  const people = ids.map((id: string) => ({ user_id: id, name: nameOf(id) as string }))
  const rows = (clients ?? []).map((c: any) => ({ ...c, owner_name: nameOf(c.owner_id) }))

  return <ClientsClient clients={rows} people={people} />
}
