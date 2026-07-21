import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageDocuments } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentsClient } from './documents-client'

export default async function DocumentsPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('documents')
  if (!tenantId) return null

  const [{ data: docs }, { data: clients }] = await Promise.all([
    supabase.from('documents').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
  ])

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
  const clientName = (id: string | null) => (id ? (clients ?? []).find((c: any) => c.id === id)?.name ?? null : null)

  const documents = (docs ?? []).map((d: any) => ({ ...d, uploader_name: nameOf(d.uploaded_by), client_name: clientName(d.client_id) }))

  return (
    <div className="space-y-6">
      <PageHeader title="Dokumenty" description="Firemní knihovna dokumentů — nahrávejte soubory nebo je ukládejte přímo z pošty." />
      <DocumentsClient documents={documents} clients={clients ?? []} currentUserId={user.id} canManage={canManageDocuments(role)} />
    </div>
  )
}
