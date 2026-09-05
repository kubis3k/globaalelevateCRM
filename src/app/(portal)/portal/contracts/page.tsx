import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { FileSignature } from 'lucide-react'
import { getPortalScope, getHiddenIds } from '../scope'
import { ContractsClient } from './contracts-client'

const PARTY: Record<string, string> = { artist: 'Umělec', rental: 'Pronájem', supplier: 'Dodavatel', client: 'Klient', other: 'Ostatní' }

// Auto-share: smlouvy navázané na klienta (business_contracts.client_id).
// Klient je zde může sám odsouhlasit (reálná e-akceptace).
export default async function PortalContractsPage() {
  const { supabase, tenantId, clientId } = await getPortalScope()

  const [{ data: contracts }, hidden] = await Promise.all([
    clientId
      ? supabase.from('business_contracts').select('*').eq('tenant_id', tenantId).eq('client_id', clientId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    clientId ? getHiddenIds(supabase, clientId, 'contract') : Promise.resolve(new Set<string>()),
  ])

  const list = (contracts ?? []).filter((c: any) => !hidden.has(c.id)).map((c: any) => ({ ...c, party_label: PARTY[c.party_type] ?? c.party_type }))

  return (
    <div className="space-y-6">
      <PageHeader title="Smlouvy" description="Smlouvy navázané na vaši firmu — přehled a odsouhlasení." />
      {list.length === 0 ? (
        clientId ? (
        <EmptyState icon={FileSignature} title="Žádné smlouvy" description="Zatím s vámi nejsou spojené žádné smlouvy." />
        ) : (
          <EmptyState icon={FileSignature} title="Účet zatím není propojen" description="Váš účet ještě nemáme napojený na firmu. Jakmile vás propojíme, uvidíte tu své smlouvy. Ozvěte se nám, pokud to má být hotové." />
        )
      ) : (
        <ContractsClient contracts={list} />
      )}
    </div>
  )
}
