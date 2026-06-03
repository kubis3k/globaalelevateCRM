import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { OpsNav } from './ops-nav'

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('ops')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="Provoz" description="Provozní postupy (SOP/wiki) a checklisty pro směny — otevření/zavření klubu, nouzové postupy, barové recepty." />
      <OpsNav />
      {children}
    </div>
  )
}
