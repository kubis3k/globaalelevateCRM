'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function addTeamMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') throw new Error('Nemáte oprávnění přidávat uživatele.')

  const username = formData.get('username') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string
  const password = formData.get('password') as string
  const email = `${username}@internal.globalelevate.com`

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError || !newUser.user) throw new Error(authError?.message || 'Chyba při vytváření uživatele.')

  await admin.from('profiles').insert({ id: newUser.user.id, username, full_name: fullName })
  await admin.from('tenant_users').insert({ tenant_id: tenantUser.tenant_id, user_id: newUser.user.id, role: role as any })

  revalidatePath('/team')
}

export async function removeTeamMember(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.id === userId) throw new Error('Nemůžete smazat sami sebe.')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tenantUser || tenantUser.role !== 'admin') throw new Error('Nemáte oprávnění mazat uživatele.')

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error('Chyba při mazání uživatele.')

  revalidatePath('/team')
}
