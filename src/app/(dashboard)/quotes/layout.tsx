import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { QuotesNav } from './quotes-nav'

export default async function QuotesLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('quotes')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="Nabídky" description="Cenové nabídky a katalog produktů a služeb." />
      <QuotesNav />
      {children}
    </div>
  )
}
