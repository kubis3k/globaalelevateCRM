import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { blobResponse } from '@/lib/storage/blob'

// Replaces the Supabase createSignedUrl() flow for the shared Documents
// library. No token in the URL — every request re-checks the caller's own
// session + tenant scope, which is a stronger guarantee than a leaked
// time-limited signed URL would have been.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return new Response('Forbidden', { status: 403 })
  // Interní download library. Externí (klientský portál) sem NESMÍ — má vlastní
  // client-scoped route /api/portal/documents/[id]/download. Bez tohohle by
  // external se svým tenant_id stáhl libovolný dokument firmy, ne jen svůj.
  if ((tu.role as string) === 'external') return new Response('Forbidden', { status: 403 })

  const { data: doc } = await admin.from('documents').select('name, storage_path').eq('id', id).eq('tenant_id', tu.tenant_id).maybeSingle()
  if (!doc?.storage_path) return new Response('Not found', { status: 404 })

  return blobResponse(doc.storage_path, { filename: doc.name })
}
