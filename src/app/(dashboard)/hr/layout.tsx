import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { HrNav } from './hr-nav'

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('hr')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="HR" description="Personalistika, dovolená, docházka, dokumenty a nábor." />
      <HrNav />
      {children}
    </div>
  )
}
