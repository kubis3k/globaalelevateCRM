import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { ProspectsClient } from './prospects-client'

export default async function ProspectsPage() {
  const { supabase, tenantId } = await requireModuleAccess('prospects')
  if (!tenantId) return <NoTenantView />

  const [{ data: prospects }, { data: tenantUsers }, { data: touches }] = await Promise.all([
    supabase.from('crm_prospects').select('*').eq('tenant_id', tenantId)
      .order('score', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('crm_prospect_touches').select('*').eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }).limit(1000),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', ids)
    : { data: [] as any[] }
  const nameOf = (id: string | null) => {
    if (!id) return null
    const p = (profiles ?? []).find((x: any) => x.id === id)
    return p?.full_name || p?.username || id.slice(0, 8)
  }
  const people = ids.map((id: string) => ({ user_id: id, name: nameOf(id) as string }))

  const touchesByProspect: Record<string, any[]> = {}
  for (const t of touches ?? []) {
    (touchesByProspect[t.prospect_id] ||= []).push({ ...t, author: nameOf(t.created_by) })
  }
  const rows = (prospects ?? []).map((p: any) => ({ ...p, owner_name: nameOf(p.owner) }))

  return <ProspectsClient prospects={rows} people={people} touches={touchesByProspect} />
}
