import { requireModuleAccess } from '@/lib/supabase/tenant'
import { AiClient } from './ai-client'

export default async function AiPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('globaal-ai')
  if (!tenantId) return null

  const { data: convos } = await supabase
    .from('ai_conversations')
    .select('id, title, owner_id, created_by, updated_at')
    .eq('tenant_id', tenantId)
    .or(`owner_id.is.null,owner_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  const isMgr = role === 'admin' || role === 'manager'
  const conversations = (convos ?? []).map((c: any) => ({
    id: c.id,
    title: c.title || 'Nový chat',
    shared: c.owner_id === null,
    canManage: c.owner_id ? c.owner_id === user.id : (c.created_by === user.id || isMgr),
  }))

  return <AiClient conversations={conversations} />
}
