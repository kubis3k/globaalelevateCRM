import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageHr } from '@/lib/permissions'
import { blobResponse } from '@/lib/storage/blob'

// Replaces hr/actions.ts's applicantCvUrl() signed-url flow.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id || !canManageHr(tu.role as string)) return new Response('Forbidden', { status: 403 })

  const { data: cand } = await admin.from('hr_candidates').select('name, cv_path').eq('id', id).eq('tenant_id', tu.tenant_id).maybeSingle()
  if (!cand?.cv_path) return new Response('Not found', { status: 404 })

  return blobResponse(cand.cv_path, { filename: cand.name ? `CV_${cand.name}` : undefined })
}
