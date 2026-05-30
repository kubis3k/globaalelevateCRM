'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const { error } = await admin.from('transactions').insert({
    tenant_id: tenantUser.tenant_id,
    type: formData.get('type') as string,
    amount: parseFloat(formData.get('amount') as string),
    currency: (formData.get('currency') as string) || 'CZK',
    date: formData.get('date') as string,
    description: formData.get('description') as string,
    created_by: user.id
  })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
  revalidatePath('/dashboard')
}

export async function deleteTransaction(transactionId: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('transactions').delete().eq('id', transactionId)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
  revalidatePath('/dashboard')
}
