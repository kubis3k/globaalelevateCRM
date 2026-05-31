'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageSharedMail } from '@/lib/permissions'
import { encryptSecret, decryptSecret } from '@/lib/mail/crypto'
import { withImap, listFolders, listMessages, getMessage, type MailConn } from '@/lib/mail/imap'

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

// Loads an account the caller may access (shared OR their own personal) and
// decrypts the secret. Returns null if not found / not permitted.
async function loadAccount(c: Ctx, accountId: string): Promise<(MailConn & { id: string; smtp_host: string; smtp_port: number; email: string; display_name: string }) | null> {
  const { data: acc } = await c.admin.from('mail_accounts').select('*').eq('id', accountId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!acc) return null
  if (acc.owner_id && acc.owner_id !== c.userId) return null
  return {
    id: acc.id, email: acc.email, display_name: acc.display_name,
    password: decryptSecret(acc.secret_enc),
    imap_host: acc.imap_host, imap_port: acc.imap_port,
    smtp_host: acc.smtp_host, smtp_port: acc.smtp_port,
  }
}

export async function connectAccount(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const scope = (formData.get('scope') as string) || 'personal'
  if (scope === 'shared' && !canManageSharedMail(c.role)) return { error: 'Sdílenou schránku může připojit jen admin nebo manažer.' }

  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string) || ''
  if (!email || !password) return { error: 'Vyplňte e-mail a app password.' }

  const imap_host = (formData.get('imapHost') as string)?.trim() || 'imap.zoho.eu'
  const imap_port = Number(formData.get('imapPort')) || 993
  const smtp_host = (formData.get('smtpHost') as string)?.trim() || 'smtp.zoho.eu'
  const smtp_port = Number(formData.get('smtpPort')) || 465

  // Verify the credentials before saving (clear, immediate feedback).
  try {
    await withImap({ email, password, imap_host, imap_port }, (client) => client.list())
  } catch (e: any) {
    return { error: 'Připojení selhalo: ' + (e?.message || 'zkontrolujte e-mail, app password a povolený IMAP přístup v Zoho.') }
  }

  const { error } = await c.admin.from('mail_accounts').insert({
    tenant_id: c.tenantId,
    owner_id: scope === 'shared' ? null : c.userId,
    email,
    display_name: (formData.get('displayName') as string)?.trim() || email,
    imap_host, imap_port, smtp_host, smtp_port,
    secret_enc: encryptSecret(password),
    created_by: c.userId,
  })
  if (error) return { error: error.message }
  revalidatePath('/mail')
  return {}
}

export async function deleteAccount(accountId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: acc } = await c.admin.from('mail_accounts').select('owner_id').eq('id', accountId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!acc) return { error: 'Schránka nenalezena.' }
  if (acc.owner_id ? acc.owner_id !== c.userId : !canManageSharedMail(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('mail_accounts').delete().eq('id', accountId).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/mail')
  return {}
}

export async function listMailFolders(accountId: string): Promise<{ folders?: any[]; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  const acc = await loadAccount(c, accountId)
  if (!acc) return { error: 'Schránka nenalezena.' }
  try {
    const folders = await withImap(acc, (client) => listFolders(client))
    return { folders }
  } catch (e: any) {
    return { error: e?.message || 'Nepodařilo se načíst složky.' }
  }
}

export async function listMailMessages(accountId: string, folder: string): Promise<{ messages?: any[]; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  const acc = await loadAccount(c, accountId)
  if (!acc) return { error: 'Schránka nenalezena.' }
  try {
    const messages = await withImap(acc, (client) => listMessages(client, folder, 40))
    return { messages }
  } catch (e: any) {
    return { error: e?.message || 'Nepodařilo se načíst zprávy.' }
  }
}

export async function getMailMessage(accountId: string, folder: string, uid: number): Promise<{ message?: any; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  const acc = await loadAccount(c, accountId)
  if (!acc) return { error: 'Schránka nenalezena.' }
  try {
    const message = await withImap(acc, (client) => getMessage(client, folder, uid))
    if (!message) return { error: 'Zpráva nenalezena.' }
    return { message }
  } catch (e: any) {
    return { error: e?.message || 'Nepodařilo se načíst zprávu.' }
  }
}
