'use client'

import { upload } from '@vercel/blob/client'
import { MAX_DOCUMENT_BYTES } from '@/lib/documents'
import { finalizeUpload } from '@/app/(dashboard)/documents/actions'

// Uploads a file straight to Vercel Blob (private) via the browser, then
// registers the documents row. Avoids the ~4.5 MB server-action body limit, so
// large media (rendered videos, PC uploads) save reliably.
export async function uploadToDocuments(
  file: Blob,
  opts: { name: string; category?: string; sourceRef?: string; contentType?: string },
): Promise<{ id?: string; error?: string }> {
  const size = (file as File).size
  if (size && size > MAX_DOCUMENT_BYTES) return { error: 'Soubor je větší než 25 MB.' }
  const contentType = opts.contentType || (file as File).type || undefined
  const ext = opts.name.includes('.') ? '.' + opts.name.split('.').pop() : ''
  const pathname = `documents/${crypto.randomUUID()}${ext}`

  let path: string
  try {
    const blob = await upload(pathname, file, { access: 'private', handleUploadUrl: '/api/blob/documents', contentType })
    path = blob.pathname
  } catch (e: any) {
    return { error: e?.message || 'Nahrání do úložiště selhalo.' }
  }

  return finalizeUpload({ path, name: opts.name, contentType, size: size ?? null, category: opts.category, sourceRef: opts.sourceRef })
}
