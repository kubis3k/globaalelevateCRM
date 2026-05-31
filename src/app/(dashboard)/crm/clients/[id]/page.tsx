import { requireModuleAccess } from '@/lib/supabase/tenant'
import { notFound } from 'next/navigation'
import { ClientDetail } from './client-detail'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId } = await requireModuleAccess('crm')
  if (!tenantId) return null

  const { data: client } = await supabase.from('crm_clients').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!client) notFound()

  const [{ data: contacts }, { data: activities }, { data: invoices }, { data: tenantUsers }] = await Promise.all([
    supabase.from('crm_contacts').select('*').eq('tenant_id', tenantId).eq('client_id', id).order('created_at', { ascending: true }),
    supabase.from('crm_activities').select('*').eq('tenant_id', tenantId).eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('tenant_id', tenantId).eq('client_id', id).order('issue_date', { ascending: false }),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const ownerName = client.owner_id
    ? (() => { const p = (profiles ?? []).find((x: any) => x.id === client.owner_id); return p?.full_name || p?.username || null })()
    : null

  return (
    <ClientDetail
      client={{ ...client, owner_name: ownerName }}
      contacts={contacts ?? []}
      activities={activities ?? []}
      invoices={invoices ?? []}
    />
  )
}
