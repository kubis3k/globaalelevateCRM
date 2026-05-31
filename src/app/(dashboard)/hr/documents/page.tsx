import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { DocumentsClient } from './documents-client'

export default async function HrDocumentsPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  const canManage = canManageHr(role)

  const { data: docs } = canManage
    ? await supabase.from('hr_documents').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
    : await supabase.from('hr_documents').select('*').eq('tenant_id', tenantId).eq('user_id', user.id).order('created_at', { ascending: false })

  const { data: tenantUsers } = await supabase.from('tenant_users').select('user_id').eq('tenant_id', tenantId)
  const ids = (tenantUsers ?? []).map((t: any) => t.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (id: string) => {
    const p = (profiles ?? []).find((x: any) => x.id === id)
    return p?.full_name || p?.username || id.slice(0, 8)
  }

  const documents = (docs ?? []).map((d: any) => ({ ...d, owner_name: nameOf(d.user_id) }))
  const people = ids.map((id: string) => ({ user_id: id, name: nameOf(id) }))

  return <DocumentsClient documents={documents} people={people} canManage={canManage} />
}
