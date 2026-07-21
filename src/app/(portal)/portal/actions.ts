'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
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

/** Klient sám akceptuje smlouvu navázanou na jeho firmu (real e-akceptace,
 * ne staff za něj). Ověří vlastnictví přes client_id, zapíše čas + IP. */
export async function acceptContract(contractId: string): Promise<{ error?: string }> {
  const { supabase, tenantId, user, clientId } = await getPortalScope()
  if (!clientId) return { error: 'Nemáte přístup k této smlouvě.' }
  const { data: contract } = await supabase.from('business_contracts').select('id, client_id, acknowledged_at').eq('id', contractId).eq('tenant_id', tenantId).maybeSingle()
  if (!contract || contract.client_id !== clientId) return { error: 'Nemáte přístup k této smlouvě.' }
  const hidden = await getHiddenIds(supabase, clientId, 'contract')
  if (hidden.has(contractId)) return { error: 'Nemáte přístup k této smlouvě.' }
  if (contract.acknowledged_at) return { error: 'Smlouva už byla odsouhlasena.' }

  let ip: string | null = null
  try { ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || (await headers()).get('x-real-ip') || null } catch { /* ignore */ }

  const { error } = await supabase.from('business_contracts').update({
    acknowledged_at: new Date().toISOString(), acknowledged_by: user.id, acknowledged_ip: ip,
  }).eq('id', contractId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }
  revalidatePath('/portal/contracts'); return {}
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
