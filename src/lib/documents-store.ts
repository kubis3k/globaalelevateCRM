import 'server-only'
import { DOCUMENTS_BUCKET } from './documents'

// Server-only write path for the document library. Both the Documents module
// (manual upload) and the Mail "save attachment" action go through this so the
// bucket name and the metadata row stay consistent. `admin` must be a
// service-role client (storage + RLS bypass).

type StoreInput = {
  tenantId: string
  uploadedBy: string
  name: string
  category?: string
  body: Buffer | Uint8Array | File | Blob
  contentType?: string
  size?: number | null
  source?: 'upload' | 'mail'
  sourceRef?: string | null
}

// Uploads the file to the private bucket and inserts the metadata row.
// Rolls back the uploaded object if the row insert fails.
export async function storeDocument(admin: any, input: StoreInput): Promise<{ id?: string; error?: string }> {
  const ext = input.name.includes('.') ? '.' + input.name.split('.').pop() : ''
  const path = `${input.tenantId}/${crypto.randomUUID()}${ext}`

  const { error: upErr } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, input.body, { contentType: input.contentType || undefined, upsert: false })
  if (upErr) return { error: upErr.message }

  const { data, error } = await admin
    .from('documents')
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      category: input.category || 'other',
      storage_path: path,
      file_size: input.size ?? null,
      mime_type: input.contentType || null,
      source: input.source || 'upload',
      source_ref: input.sourceRef || null,
      uploaded_by: input.uploadedBy,
    })
    .select('id')
    .single()

  if (error) {
    // Best-effort rollback so we don't leave an orphaned object behind.
    try { await admin.storage.from(DOCUMENTS_BUCKET).remove([path]) } catch { /* ignore */ }
    return { error: error.message }
  }
  return { id: data.id }
}
