'use client'

import { createClient } from '@/lib/supabase/client'
import { DOCUMENTS_BUCKET, MAX_DOCUMENT_BYTES } from '@/lib/documents'
import { createUploadUrl, finalizeUpload } from '@/app/(dashboard)/documents/actions'

// Uploads a file straight to Supabase Storage via a signed upload URL, then
// registers the documents row. Avoids the ~4.5 MB server-action body limit, so
// large media (rendered videos, PC uploads) save reliably.
export async function uploadToDocuments(
  file: Blob,
  opts: { name: string; category?: string; sourceRef?: string; contentType?: string },
): Promise<{ id?: string; error?: string }> {
  const size = (file as File).size
  if (size && size > MAX_DOCUMENT_BYTES) return { error: 'Soubor je větší než 25 MB.' }
  const contentType = opts.contentType || (file as File).type || undefined

  const prep = await createUploadUrl(opts.name)
  if (prep.error || !prep.path || !prep.token) return { error: prep.error || 'Upload se nepodařilo připravit.' }

  try {
    const supabase = createClient()
    const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).uploadToSignedUrl(prep.path, prep.token, file, { contentType })
    if (error) return { error: error.message }
  } catch (e: any) {
    return { error: e?.message || 'Nahrání do úložiště selhalo.' }
  }

  return finalizeUpload({ path: prep.path, name: opts.name, contentType, size: size ?? null, category: opts.category, sourceRef: opts.sourceRef })
}
