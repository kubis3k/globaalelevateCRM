import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { CrmNav } from './crm-nav'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('crm')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="CRM" description="Klienti, kontakty, obchodní příležitosti a aktivity." />
      <CrmNav />
      {children}
    </div>
  )
}
