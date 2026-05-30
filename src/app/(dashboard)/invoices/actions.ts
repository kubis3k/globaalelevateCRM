'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Ověření uživatele a zjištění jeho tenant_id
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const invoiceData = {
    tenant_id: tenantUser.tenant_id,
    type: formData.get('type') as string,
    status: formData.get('status') as string,
    invoice_number: formData.get('invoiceNumber') as string,
    client_name: formData.get('clientName') as string,
    amount: parseFloat(formData.get('amount') as string),
    currency: formData.get('currency') as string || 'CZK',
    issue_date: formData.get('issueDate') as string,
    due_date: formData.get('dueDate') as string,
    created_by: user.id
  }

  const { error } = await supabase
    .from('invoices')
    .insert(invoiceData)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/invoices')
}

export async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('invoices')
    .update({ status: newStatus })
    .eq('id', invoiceId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/invoices')
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/invoices')
}
