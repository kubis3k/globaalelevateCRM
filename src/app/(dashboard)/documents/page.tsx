import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageDocuments } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentsClient } from './documents-client'

export default async function DocumentsPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('documents')
  if (!tenantId) return null

  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // Resolve uploader names (no FK embed available → fetch + merge in JS).
  const ids = Array.from(new Set((docs ?? []).map((d: any) => d.uploaded_by).filter(Boolean)))
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', ids)
    : { data: [] as any[] }
  const nameOf = (id: string | null) => {
    if (!id) return '—'
    const p = (profiles ?? []).find((x: any) => x.id === id)
    return p?.full_name || p?.username || id.slice(0, 8)
  }

  const documents = (docs ?? []).map((d: any) => ({ ...d, uploader_name: nameOf(d.uploaded_by) }))

  return (
    <div className="space-y-6">
      <PageHeader title="Dokumenty" description="Firemní knihovna dokumentů — nahrávejte soubory nebo je ukládejte přímo z pošty." />
      <DocumentsClient documents={documents} currentUserId={user.id} canManage={canManageDocuments(role)} />
    </div>
  )
}
