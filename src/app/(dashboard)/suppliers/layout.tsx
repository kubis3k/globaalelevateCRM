import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { SuppliersNav } from './suppliers-nav'

export default async function SuppliersLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('suppliers')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="Dodavatelé" description="Dodavatelé (umělci, security, půjčovny, nápoje) a objednávky napojené na akce a Finance." />
      <SuppliersNav />
      {children}
    </div>
  )
}
