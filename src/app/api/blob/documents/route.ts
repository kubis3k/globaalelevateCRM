import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Token-generation endpoint for direct browser→Blob uploads into the Documents
// library (business contracts, deliverables, generic large-file uploads).
// Replaces Supabase's createSignedUploadUrl/uploadToSignedUrl pair — the
// client calls `upload()` from '@vercel/blob/client' pointed at this route,
// then registers the metadata row itself via finalizeUpload(), same as before.
export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Nejste přihlášen.')
        // Externí (portál) nesmí generovat upload tokeny do interní Documents library.
        const admin = createAdminClient()
        const { data: tu } = await admin.from('tenant_users').select('role').eq('user_id', user.id).maybeSingle()
        if (!tu || (tu.role as string) === 'external') throw new Error('Nemáte oprávnění.')
        if (!pathname.startsWith('documents/')) throw new Error('Neplatná cesta.')
        return { addRandomSuffix: false }
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Upload se nepodařilo připravit.' }, { status: 400 })
  }
}
