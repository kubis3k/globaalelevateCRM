'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const transactionData = {
    tenant_id: tenantUser.tenant_id,
    type: formData.get('type') as string,
    amount: parseFloat(formData.get('amount') as string),
    currency: formData.get('currency') as string || 'CZK',
    date: formData.get('date') as string,
    description: formData.get('description') as string,
    created_by: user.id
  }

  const { error } = await supabase
    .from('transactions')
    .insert(transactionData)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/finance')
  revalidatePath('/dashboard')
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/finance')
  revalidatePath('/dashboard')
}
