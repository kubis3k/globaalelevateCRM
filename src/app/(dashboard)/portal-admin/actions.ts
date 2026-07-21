'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function invitePortalUser(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const username = str(formData, 'username')
  const password = str(formData, 'password')
  const displayName = str(formData, 'displayName')
  const clientId = str(formData, 'clientId')
  if (!username || !password) return { error: 'Vyplňte uživatelské jméno i heslo.' }
  if (password.length < 6) return { error: 'Heslo musí mít alespoň 6 znaků.' }

  const email = `${username}@globaalelevate.com`
  const { data: existing } = await c.admin.from('profiles').select('id').eq('username', username).maybeSingle()
  if (existing) return { error: 'Uživatelské jméno již existuje.' }

  const { data: newUser, error: authError } = await c.admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (authError || !newUser.user) return { error: authError?.message || 'Chyba při vytváření uživatele.' }
  const uid = newUser.user.id

  const { error: profErr } = await c.admin.from('profiles').upsert({ id: uid, username, full_name: displayName || username })
  if (profErr) { await c.admin.auth.admin.deleteUser(uid); return { error: profErr.message } }

  const { error: tuErr } = await c.admin.from('tenant_users').insert({ tenant_id: c.tenantId, user_id: uid, role: 'external' as any })
  if (tuErr) { await c.admin.auth.admin.deleteUser(uid); return { error: tuErr.message } }

  const { error: paErr } = await c.admin.from('portal_access').insert({
    user_id: uid, tenant_id: c.tenantId,
    client_id: clientId && clientId !== 'none' ? clientId : null,
    display_name: displayName || username,
  })
  if (paErr) { await c.admin.auth.admin.deleteUser(uid); return { error: paErr.message } }

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
