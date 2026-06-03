'use server'

import { getPortalScope } from './scope'

/** Signed download URL for a document the external user was explicitly granted. */
export async function portalDocUrl(documentId: string): Promise<{ url?: string; error?: string }> {
  const { supabase, user } = await getPortalScope()
  const { data: link } = await supabase
    .from('portal_document_access')
    .select('document_id')
    .eq('user_id', user.id)
    .eq('document_id', documentId)
    .maybeSingle()
  if (!link) return { error: 'Nemáte přístup k tomuto dokumentu.' }
  const { data: doc } = await supabase.from('documents').select('storage_path').eq('id', documentId).maybeSingle()
  if (!doc?.storage_path) return { error: 'Dokument nenalezen.' }
  const { data: signed, error } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 120)
  if (error || !signed?.signedUrl) return { error: 'Nepodařilo se vytvořit odkaz ke stažení.' }
  return { url: signed.signedUrl }
}
