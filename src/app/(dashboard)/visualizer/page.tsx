import { requireModuleAccess } from '@/lib/supabase/tenant'
import { PageHeader } from '@/components/ui/page-header'
import { VisualizerClient } from './visualizer-client'

export default async function VisualizerPage() {
  const { supabase, tenantId } = await requireModuleAccess('visualizer')
  if (!tenantId) return null

  const { data } = await supabase
    .from('documents')
    .select('id, name, mime_type')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(300)

  const documents = (data ?? [])
    .map((d: any) => ({ id: d.id, name: d.name, kind: String(d.mime_type || '').startsWith('video') ? 'video' : 'image', mime: d.mime_type }))
    .filter((d: any) => String(d.mime || '').startsWith('image') || String(d.mime || '').startsWith('video'))
    .map(({ id, name, kind }: any) => ({ id, name, kind }))

  return (
    <div className="space-y-6">
      <PageHeader title="Vizualizátor" description="3D model klubu — promítni návrhy grafik a animací přímo na LED panely u stage." />
      <VisualizerClient documents={documents} />
    </div>
  )
}
