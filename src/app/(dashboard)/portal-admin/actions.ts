'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/mail/invite'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  if (tu.role !== 'admin') return { error: 'Spravovat portál může jen administrátor.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }

async function inviteLink(token: string): Promise<string> {
  const h = await headers()
  const host = h.get('host') || 'work.globaalelevate.com'
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  return `${proto}://${host}/invite/${token}`
}

function inviteEmailHtml(displayName: string | null, link: string): string {
  return `
    <p>Dobrý den${displayName ? ` ${displayName}` : ''},</p>
    <p>byli jste pozváni do klientského portálu <strong>Globaal Elevate</strong>. Uvidíte tam své akce, faktury, smlouvy a dodávky.</p>
    <p>Nastavte si prosím heslo kliknutím na odkaz níže (platí 7 dní):</p>
    <p><a href="${link}">${link}</a></p>
    <p style="color:#888;font-size:12px">Pokud jste pozvánku nečekali, tento e-mail ignorujte.</p>
  `.trim()
}

// Pozvánka e-mailem — klient si sám nastaví heslo na /invite/[token] (nahrazuje
// dřívější ruční zadání jména+hesla adminem).
export async function sendPortalInvite(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const email = str(formData, 'email')?.toLowerCase() ?? null
  if (!email || !email.includes('@')) return { error: 'Zadejte platný e-mail.' }
  const displayName = str(formData, 'displayName')
  const clientId = opt(formData, 'clientId')

  const { data: pending } = await c.admin.from('portal_invites')
    .select('id').eq('tenant_id', c.tenantId).eq('email', email).is('used_at', null).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (pending) return { error: 'Pro tento e-mail už existuje nevyužitá pozvánka (lze poslat znovu tlačítkem Přeposlat).' }

  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
  const { error: insErr } = await c.admin.from('portal_invites').insert({
    tenant_id: c.tenantId, client_id: clientId, email, display_name: displayName, token, invited_by: c.userId, expires_at: expiresAt,
  })
  if (insErr) return { error: insErr.message }

  const link = await inviteLink(token)
  const sent = await sendTransactionalEmail(c.admin, c.tenantId, {
    to: email, subject: 'Pozvánka do klientského portálu — Globaal Elevate', html: inviteEmailHtml(displayName, link),
  })
  if (sent.error) return { error: sent.error }

  revalidatePath('/portal-admin'); return {}
}

export async function resendPortalInvite(inviteId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: inv } = await c.admin.from('portal_invites').select('*').eq('id', inviteId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!inv) return { error: 'Pozvánka nenalezena.' }
  if (inv.used_at) return { error: 'Pozvánka už byla využita.' }

  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
  const { error: updErr } = await c.admin.from('portal_invites').update({ expires_at: expiresAt }).eq('id', inviteId)
  if (updErr) return { error: updErr.message }

  const link = await inviteLink(inv.token)
  const sent = await sendTransactionalEmail(c.admin, c.tenantId, {
    to: inv.email, subject: 'Pozvánka do klientského portálu — Globaal Elevate', html: inviteEmailHtml(inv.display_name, link),
  })
  if (sent.error) return { error: sent.error }
  revalidatePath('/portal-admin'); return {}
}

export async function revokePortalInvite(inviteId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('portal_invites').delete().eq('id', inviteId).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/portal-admin'); return {}
}

export async function deletePortalUser(userId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  // Pojistka: mazat smí jen externí účet z tohoto tenantu.
  const { data: pa } = await c.admin.from('portal_access').select('user_id').eq('user_id', userId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!pa) return { error: 'Účet portálu nenalezen.' }
  await c.admin.auth.admin.deleteUser(userId) // cascade smaže tenant_users + portal_* (FK ON DELETE CASCADE)
  revalidatePath('/portal-admin'); return {}
}

export async function setPortalClient(userId: string, clientId: string | null): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('portal_access')
    .update({ client_id: clientId && clientId !== 'none' ? clientId : null })
    .eq('user_id', userId).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/portal-admin'); return {}
}

// Auto-share model: vše s client_id = klientovi se zobrazí automaticky.
// Tady se řeší jen výjimka — skrytí/odkrytí jednotlivé položky.
export async function togglePortalVisibility(
  clientId: string, itemType: 'event' | 'document' | 'contract' | 'deliverable', itemId: string, hidden: boolean,
): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (hidden) {
    const { error } = await c.admin.from('portal_visibility_overrides').upsert(
      { tenant_id: c.tenantId, client_id: clientId, item_type: itemType, item_id: itemId, created_by: c.userId },
      { onConflict: 'client_id,item_type,item_id' })
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('portal_visibility_overrides')
      .delete().eq('client_id', clientId).eq('item_type', itemType).eq('item_id', itemId).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
  }
  revalidatePath('/portal-admin'); return {}
}

// ─── Portal messages ───────────────────────────────────────────
export async function resolvePortalMessage(id: string, resolved: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('portal_messages').update({ status: resolved ? 'resolved' : 'new' }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/portal-admin'); return {}
}

export async function deletePortalMessage(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('portal_messages').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/portal-admin'); return {}
}
