import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { BusinessContractsClient } from './business-contracts-client'

export default async function BusinessContractsPage() {
  const { supabase, tenantId } = await requireModuleAccess('business-contracts')
  if (!tenantId) return <NoTenantView />

  const [{ data: contracts }, { data: suppliers }, { data: clients }, { data: events }, { data: documents }] = await Promise.all([
    supabase.from('business_contracts').select('*').eq('tenant_id', tenantId).order('end_date', { ascending: true }),
    supabase.from('suppliers').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('events').select('id, name').eq('tenant_id', tenantId).order('event_date', { ascending: false }).limit(200),
    supabase.from('documents').select('id, name').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(300),
  ])
  const partyName = (c: any) =>
    (c.supplier_id && (suppliers ?? []).find((s: any) => s.id === c.supplier_id)?.name) ||
    (c.client_id && (clients ?? []).find((x: any) => x.id === c.client_id)?.name) ||
    c.counterparty || null
  const docName = (id: string | null) => (documents ?? []).find((d: any) => d.id === id)?.name || null
  const full = (contracts ?? []).map((c: any) => ({ ...c, party_name: partyName(c), document_name: docName(c.document_id) }))

  return (
    <div className="space-y-6">
      <PageHeader title="Obchodní smlouvy" description="Smlouvy s umělci, pronájmy a dodavateli — platnost, expirace a e-akceptace." />
      <BusinessContractsClient contracts={full} suppliers={suppliers ?? []} clients={clients ?? []} events={events ?? []} documents={documents ?? []} />
    </div>
  )
}
