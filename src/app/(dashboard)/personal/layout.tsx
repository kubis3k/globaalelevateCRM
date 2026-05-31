import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { PersonalNav } from './personal-nav'

export default async function PersonalLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('personal')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="Osobní sektor" description="Tvůj soukromý prostor — poznámky, úkoly a osobní kalendář. Vidíš jen ty." />
      <PersonalNav />
      {children}
    </div>
  )
}
