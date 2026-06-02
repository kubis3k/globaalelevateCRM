import { requireModuleAccess } from '@/lib/supabase/tenant'
import { PageHeader } from '@/components/ui/page-header'
import { AnimationStudio } from './animation-studio'

export default async function AnimationsPage() {
  const { supabase, tenantId } = await requireModuleAccess('animations')
  if (!tenantId) return null

  // Image documents (e.g. saved 3D logos / graphics) available to drop onto an
  // animated background — the link with the Documents module.
  const { data: images } = await supabase
    .from('documents')
    .select('id, name, category')
    .eq('tenant_id', tenantId)
    .ilike('mime_type', 'image/%')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <PageHeader title="Animační studio" description="Vlož grafiku nebo 3D logo z Dokumentů, polož ho na animované pozadí a vyexportuj video." />
      <AnimationStudio documentImages={images ?? []} />
    </div>
  )
}
