'use server'

import { revalidatePath } from 'next/cache'
import { getPortalScope, getHiddenIds } from './scope'

/** Signed download URL for a document auto-shared with this client (defense in depth). */
export async function portalDocUrl(documentId: string): Promise<{ url?: string; error?: string }> {
  const { supabase, tenantId, clientId } = await getPortalScope()
  if (!clientId) return { error: 'Nemáte přístup k tomuto dokumentu.' }
  const { data: doc } = await supabase.from('documents').select('storage_path, client_id').eq('id', documentId).eq('tenant_id', tenantId).maybeSingle()
  if (!doc?.storage_path || doc.client_id !== clientId) return { error: 'Nemáte přístup k tomuto dokumentu.' }
  const hidden = await getHiddenIds(supabase, clientId, 'document')
  if (hidden.has(documentId)) return { error: 'Nemáte přístup k tomuto dokumentu.' }
  const { data: signed, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 120)
  if (error || !signed?.signedUrl) return { error: 'Nepodařilo se vytvořit odkaz ke stažení.' }
  return { url: signed.signedUrl }
}

/** External user sends a message/request to the venue. */
export async function sendPortalMessage(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, tenantId } = await getPortalScope()
  const subject = (formData.get('subject') as string)?.trim() || null
  const body = (formData.get('body') as string)?.trim()
  if (!body) return { error: 'Napište zprávu.' }
  const { error } = await supabase.from('portal_messages').insert({ tenant_id: tenantId, user_id: user.id, subject, body, status: 'new' })
  if (error) return { error: error.message }
  revalidatePath('/portal/messages'); return {}
}
