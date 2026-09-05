'use server'

import { createAdminClient } from '@/lib/supabase/admin'

function usernameFromEmail(email: string): string {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return base || 'klient'
}

// Veřejná akce (bez přihlášení) — klient si na základě platného tokenu
// pozvánky sám nastaví heslo a vytvoří si tím portálový účet.
export async function acceptInvite(token: string, password: string): Promise<{ error?: string }> {
  if (!token) return { error: 'Chybí token pozvánky.' }
  if (!password || password.length < 8) return { error: 'Heslo musí mít alespoň 8 znaků.' }

  const admin = createAdminClient()
  const { data: invite } = await admin.from('portal_invites').select('*').eq('token', token).maybeSingle()
  if (!invite) return { error: 'Pozvánka nenalezena nebo je neplatná.' }
  if (invite.used_at) return { error: 'Tato pozvánka už byla využita. Přihlaste se prosím na /login.' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'Pozvánka vypršela. Požádejte o novou.' }

  let username = usernameFromEmail(invite.email)
  const { data: existingUsername } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
  if (existingUsername) username = `${username}-${invite.id.slice(0, 6)}`

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email: invite.email, password, email_confirm: true,
  })
  if (authError || !newUser.user) {
    return { error: authError?.message?.includes('already') ? 'Pro tento e-mail už existuje účet — zkuste se přihlásit.' : (authError?.message || 'Chyba při vytváření účtu.') }
  }
  const uid = newUser.user.id

  const { error: profErr } = await admin.from('profiles').upsert({ id: uid, username, full_name: invite.display_name || username })
  if (profErr) { await admin.auth.admin.deleteUser(uid); return { error: profErr.message } }

  const { error: tuErr } = await admin.from('tenant_users').insert({ tenant_id: invite.tenant_id, user_id: uid, role: 'external' as any })
  if (tuErr) { await admin.auth.admin.deleteUser(uid); return { error: tuErr.message } }

  const { error: paErr } = await admin.from('portal_access').insert({
    user_id: uid, tenant_id: invite.tenant_id, client_id: invite.client_id, display_name: invite.display_name || username,
  })
  if (paErr) { await admin.auth.admin.deleteUser(uid); return { error: paErr.message } }

  await admin.from('portal_invites').update({ used_at: new Date() }).eq('id', invite.id)
  return {}
}
