import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { TimeNav } from './time-nav'

export default async function TimeLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('time')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="Výkazy práce" description="Odpracované hodiny na projektech a jejich fakturovatelnost." />
      <TimeNav />
      {children}
    </div>
  )
}
