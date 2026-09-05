import 'server-only'
import { putObject, removeObjects } from './storage/blob'

// Server-only write path for the document library. Both the Documents module
// (manual upload) and the Mail "save attachment" action go through this so the
// storage path and the metadata row stay consistent. `admin` must be a
// service-role client (RLS bypass on the `documents` table).

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
  clientId?: string | null
}

// Uploads the file to the private bucket and inserts the metadata row.
// Rolls back the uploaded object if the row insert fails.
export async function storeDocument(admin: any, input: StoreInput): Promise<{ id?: string; error?: string }> {
  const ext = input.name.includes('.') ? '.' + input.name.split('.').pop() : ''
  const path = `documents/${crypto.randomUUID()}${ext}`

  const up = await putObject(path, input.body, input.contentType || undefined)
  if (up.error) return { error: up.error }

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
      client_id: input.clientId || null,
    })
    .select('id')
    .single()

  if (error) {
    // Best-effort rollback so we don't leave an orphaned object behind.
    await removeObjects([path])
    return { error: error.message }
  }
  return { id: data.id }
}
