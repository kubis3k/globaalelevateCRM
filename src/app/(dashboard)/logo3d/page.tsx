import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { Logo3DStudioClient } from './logo3d-client'

export default async function Logo3DPage() {
  const { tenantId } = await requireModuleAccess('logo3d')
  if (!tenantId) return <NoTenantView />

  return (
    <div className="space-y-4">
      <PageHeader title="3D Studio" description="Z 2D loga nebo grafiky uděláš otáčecí 3D model — export .glb a PNG." />
      <Logo3DStudioClient />
    </div>
  )
}
