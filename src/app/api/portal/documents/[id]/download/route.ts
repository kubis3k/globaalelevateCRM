import { NextRequest } from 'next/server'
import { getPortalScope, getHiddenIds } from '@/app/(portal)/portal/scope'
import { blobResponse } from '@/lib/storage/blob'

// Portal (external client) equivalent of /api/documents/[id]/download —
// mirrors the same auto-share + hidden-override checks that portalDocUrl()
// used to do before handing back a Supabase signed URL.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId, clientId } = await getPortalScope()
  if (!clientId) return new Response('Forbidden', { status: 403 })

  const { data: doc } = await supabase.from('documents').select('name, storage_path, client_id').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!doc?.storage_path || doc.client_id !== clientId) return new Response('Not found', { status: 404 })

  const hidden = await getHiddenIds(supabase, clientId, 'document')
  if (hidden.has(id)) return new Response('Not found', { status: 404 })

  return blobResponse(doc.storage_path, { filename: doc.name })
}
