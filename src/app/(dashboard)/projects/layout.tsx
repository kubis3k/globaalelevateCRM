import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { ProjectsNav } from './projects-nav'

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const { tenantId } = await requireModuleAccess('projects')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-6">
      <PageHeader title="Projekty" description="Zakázky, úkoly a jejich průběh." />
      <ProjectsNav />
      {children}
    </div>
  )
}
