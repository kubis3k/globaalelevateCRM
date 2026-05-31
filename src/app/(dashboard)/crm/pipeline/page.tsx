import { requireModuleAccess } from '@/lib/supabase/tenant'
import { PipelineClient } from './pipeline-client'

export default async function CrmPipelinePage() {
  const { supabase, tenantId } = await requireModuleAccess('crm')
  if (!tenantId) return null

  const [{ data: deals }, { data: clients }, { data: tenantUsers }] = await Promise.all([
    supabase.from('crm_deals').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const ownerName = (id: string | null) => { if (!id) return null; const p = (profiles ?? []).find((x: any) => x.id === id); return p?.full_name || p?.username || null }
  const clientName = (id: string | null) => (clients ?? []).find((c: any) => c.id === id)?.name || null

  const dealsFull = (deals ?? []).map((d: any) => ({ ...d, client_name: clientName(d.client_id), owner_name: ownerName(d.owner_id) }))
  const people = ids.map((id: string) => ({ user_id: id, name: ownerName(id) as string }))

  return <PipelineClient deals={dealsFull} clients={clients ?? []} people={people} />
}
