'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Team members ──────────────────────────────────────────────

export async function addTeamMember(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') return { error: 'Nemáte oprávnění přidávat uživatele.' }

  const username = (formData.get('username') as string)?.trim()
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string
  const customRoleId = formData.get('customRoleId') as string
  const password = formData.get('password') as string
  if (!username || !password) return { error: 'Vyplňte uživatelské jméno i heslo.' }

  // Stejné mapování jako v login/actions.ts – jinak by se uživatel nepřihlásil.
  const email = `${username}@globaalelevate.com`

  // Profil zakládá automaticky DB trigger handle_new_user při vzniku auth uživatele,
  // proto nevkládáme, ale upsertujeme. Předkontrola jména brání vzniku osiřelého uživatele.
  const { data: existing } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
  if (existing) return { error: 'Uživatelské jméno již existuje.' }

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError || !newUser.user) return { error: authError?.message || 'Chyba při vytváření uživatele.' }

  // Trigger profil už vytvořil (s prázdným full_name) → doplníme jméno přes upsert.
  const { error: profileError } = await admin.from('profiles').upsert({ id: newUser.user.id, username, full_name: fullName })
  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id) // rollback
    return { error: profileError.code === '23505' ? 'Uživatelské jméno již existuje.' : profileError.message }
  }

  const { error: membershipError } = await admin.from('tenant_users').insert({
    tenant_id: tenantUser.tenant_id,
    user_id: newUser.user.id,
    role: role as any,
    custom_role_id: customRoleId && customRoleId !== 'none' ? customRoleId : null,
  })
  if (membershipError) {
    await admin.auth.admin.deleteUser(newUser.user.id) // rollback
    return { error: membershipError.message }
  }

  revalidatePath('/team')
  return {}
}

export async function removeTeamMember(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.id === userId) throw new Error('Nemůžete smazat sami sebe.')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') throw new Error('Nemáte oprávnění mazat uživatele.')

  await admin.auth.admin.deleteUser(userId)
  revalidatePath('/team')
}

// ─── Custom roles ───────────────────────────────────────────────

export async function createCustomRole(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') throw new Error('Nemáte oprávnění.')

  const rawModules = formData.getAll('modules') as string[]

  const { error } = await admin.from('custom_roles').insert({
    tenant_id: tenantUser.tenant_id,
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    color: formData.get('color') as string || '#6366f1',
    modules: rawModules,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Role s tímto názvem již existuje.')
    if (error.code === '42P01') throw new Error('Tabulka custom_roles ještě neexistuje – nejprve spusťte migraci v Supabase.')
    throw new Error(error.message)
  }
  revalidatePath('/team')
}

export async function updateCustomRole(roleId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') throw new Error('Nemáte oprávnění.')

  const rawModules = formData.getAll('modules') as string[]

  const { error } = await admin.from('custom_roles').update({
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    color: formData.get('color') as string || '#6366f1',
    modules: rawModules,
  }).eq('id', roleId)
  if (error) throw new Error(error.message)
  revalidatePath('/team')
}

export async function deleteCustomRole(roleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') throw new Error('Nemáte oprávnění.')

  await admin.from('custom_roles').delete().eq('id', roleId)
  revalidatePath('/team')
}

export async function assignCustomRole(userId: string, customRoleId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') throw new Error('Nemáte oprávnění.')

  await admin.from('tenant_users').update({ custom_role_id: customRoleId }).eq('user_id', userId).eq('tenant_id', tenantUser.tenant_id)
  revalidatePath('/team')
}
