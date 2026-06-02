'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageDocuments } from '@/lib/permissions'
import { DOCUMENTS_BUCKET, MAX_DOCUMENT_BYTES } from '@/lib/documents'
import { storeDocument } from '@/lib/documents-store'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role as string }
}

export async function uploadDocument(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Vyberte soubor.' }
  if (file.size > MAX_DOCUMENT_BYTES) return { error: 'Soubor je větší než 25 MB.' }

  const res = await storeDocument(c.admin, {
    tenantId: c.tenantId,
    uploadedBy: c.userId,
    name: ((formData.get('name') as string) || '').trim() || file.name,
    category: (formData.get('category') as string) || 'other',
    body: file,
    contentType: file.type || undefined,
    size: file.size,
    source: 'upload',
    sourceRef: ((formData.get('description') as string) || '').trim() || null,
  })
  if (res.error) return { error: res.error }
  revalidatePath('/documents')
  return {}
}

export async function getDocumentUrl(id: string): Promise<{ url?: string; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  const { data: doc } = await c.admin.from('documents').select('storage_path').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!doc) return { error: 'Dokument nenalezen.' }
  const { data, error } = await c.admin.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.storage_path, 60)
  if (error) return { error: error.message }
  return { url: data.signedUrl }
}

// Direct-to-storage upload. The client gets a signed upload URL, sends the file
// straight to Storage (no server-action body limit → large videos work), then
// calls finalizeUpload to register the metadata row.
export async function createUploadUrl(name: string): Promise<{ path?: string; token?: string; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  const ext = name.includes('.') ? '.' + name.split('.').pop() : ''
  const path = `${c.tenantId}/${crypto.randomUUID()}${ext}`
  const { data, error } = await c.admin.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { error: error?.message || 'Upload se nepodařilo připravit.' }
  return { path: data.path, token: data.token }
}

export async function finalizeUpload(input: { path: string; name: string; contentType?: string; size?: number | null; category?: string; sourceRef?: string }): Promise<{ id?: string; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  if (!input.path.startsWith(`${c.tenantId}/`)) return { error: 'Neplatná cesta.' }
  const { data, error } = await c.admin.from('documents').insert({
    tenant_id: c.tenantId,
    name: input.name,
    category: input.category || 'other',
    storage_path: input.path,
    file_size: input.size ?? null,
    mime_type: input.contentType || null,
    source: 'upload',
    source_ref: input.sourceRef || null,
    uploaded_by: c.userId,
  }).select('id').single()
  if (error) { try { await c.admin.storage.from(DOCUMENTS_BUCKET).remove([input.path]) } catch { } ; return { error: error.message } }
  revalidatePath('/documents')
  return { id: data.id }
}

export async function deleteDocument(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: doc } = await c.admin.from('documents').select('storage_path, uploaded_by').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!doc) return { error: 'Dokument nenalezen.' }
  // The uploader can remove their own; otherwise admin/manager only.
  if (doc.uploaded_by !== c.userId && !canManageDocuments(c.role)) return { error: 'Nemáte oprávnění tento dokument smazat.' }
  await c.admin.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path])
  const { error } = await c.admin.from('documents').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/documents')
  return {}
}
