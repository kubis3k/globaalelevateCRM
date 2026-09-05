import { requireModuleAccess } from '@/lib/supabase/tenant'
import { notFound } from 'next/navigation'
import { getUctoInvoicesForClient } from '@/lib/ucto'
import { ClientDetail } from './client-detail'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId } = await requireModuleAccess('crm')
  if (!tenantId) return null

  const { data: client } = await supabase.from('crm_clients').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!client) notFound()

  const [
    { data: contacts }, { data: activities }, { data: tenantUsers }, { data: portalAccess },
    { data: deals }, { data: quotes }, { data: reports }, { data: deliverables }, { data: contracts }, { data: events }, { data: documents },
  ] = await Promise.all([
    supabase.from('crm_contacts').select('*').eq('tenant_id', tenantId).eq('client_id', id).order('created_at', { ascending: true }),
    supabase.from('crm_activities').select('*').eq('tenant_id', tenantId).eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId),
    supabase.from('portal_access').select('user_id, display_name').eq('tenant_id', tenantId).eq('client_id', id),
    supabase.from('crm_deals').select('id, title, value, stage').eq('tenant_id', tenantId).eq('client_id', id),
    supabase.from('quotes').select('id, total, status').eq('tenant_id', tenantId).eq('client_id', id),
    supabase.from('client_reports').select('id, title, status, sent_at, created_at').eq('tenant_id', tenantId).eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('deliverables').select('id, title, status').eq('tenant_id', tenantId).eq('client_id', id),
    supabase.from('business_contracts').select('id, title, status, value').eq('tenant_id', tenantId).eq('client_id', id),
    supabase.from('events').select('id, name, event_date, status').eq('tenant_id', tenantId).eq('client_id', id).order('event_date', { ascending: false }),
    supabase.from('documents').select('id').eq('tenant_id', tenantId).eq('client_id', id),
  ])

  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const ownerName = client.owner_id
    ? (() => { const p = (profiles ?? []).find((x: any) => x.id === client.owner_id); return p?.full_name || p?.username || null })()
    : null

  // Komunikace z klientského portálu (zprávy od klienta) — do stejného feedu jako CRM aktivity.
  const portalUserIds = (portalAccess ?? []).map((p: any) => p.user_id)
  const { data: portalMessages } = portalUserIds.length
    ? await supabase.from('portal_messages').select('*').eq('tenant_id', tenantId).in('user_id', portalUserIds).order('created_at', { ascending: false })
    : { data: [] as any[] }

  // Reálné faktury z účetního systému (párováno na IČO/název) — ne z legacy tabulky.
  const uctoInvoices = await getUctoInvoicesForClient({ name: client.name, ico: client.ico })

  return (
    <ClientDetail
      client={{ ...client, owner_name: ownerName }}
      contacts={contacts ?? []}
      activities={activities ?? []}
      portalMessages={portalMessages ?? []}
      uctoInvoices={uctoInvoices}
      portalConnected={(portalAccess ?? []).length > 0}
      profiles={(profiles ?? []).map((p: any) => ({ id: p.id as string, name: (p.full_name || p.username || '—') as string }))}
      related={{
        deals: deals ?? [],
        quotes: quotes ?? [],
        reports: reports ?? [],
        deliverables: deliverables ?? [],
        contracts: contracts ?? [],
        events: events ?? [],
        documentsCount: (documents ?? []).length,
      }}
    />
  )
}
