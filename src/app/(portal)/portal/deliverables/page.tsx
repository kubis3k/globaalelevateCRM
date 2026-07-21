import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PackageCheck } from 'lucide-react'
import { getPortalScope, getHiddenIds } from '../scope'
import { DeliverablesClient } from './deliverables-client'

// Auto-share: dodávky navázané na klienta (deliverables.client_id).
export default async function PortalDeliverablesPage() {
  const { supabase, tenantId, clientId } = await getPortalScope()

  const [{ data: deliverables }, hidden] = await Promise.all([
    clientId
      ? supabase.from('deliverables').select('*').eq('tenant_id', tenantId).eq('client_id', clientId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    clientId ? getHiddenIds(supabase, clientId, 'deliverable') : Promise.resolve(new Set<string>()),
  ])

  const list = (deliverables ?? []).filter((d: any) => !hidden.has(d.id))
  const docIds = Array.from(new Set(list.map((d: any) => d.document_id).filter(Boolean)))
  const { data: docs } = docIds.length ? await supabase.from('documents').select('id, name').in('id', docIds) : { data: [] as any[] }
  const full = list.map((d: any) => ({ ...d, document_name: (docs ?? []).find((x: any) => x.id === d.document_id)?.name ?? null }))

  return (
    <div className="space-y-6">
      <PageHeader title="Dodávky" description="Práce odeslaná ke schválení — soubory a odkazy od nás." />
      {full.length === 0 ? (
        <EmptyState icon={PackageCheck} title="Zatím žádné dodávky" description="Jakmile vám odešleme práci ke schválení, objeví se zde." />
      ) : (
        <DeliverablesClient deliverables={full} />
      )}
    </div>
  )
}
