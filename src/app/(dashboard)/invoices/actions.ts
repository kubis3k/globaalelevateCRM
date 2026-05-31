'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// Keep finance in sync with an invoice: a *paid* invoice has exactly one linked
// transaction (issued→income, received→expense); a non-paid invoice has none.
async function syncInvoiceTransaction(admin: Admin, invoice: any) {
  if (!invoice) return
  if (invoice.status !== 'paid') {
    await admin.from('transactions').delete().eq('invoice_id', invoice.id)
    return
  }
  const row = {
    tenant_id: invoice.tenant_id,
    type: invoice.type === 'issued' ? 'income' : 'expense',
    amount: invoice.amount,
    currency: invoice.currency,
    date: invoice.issue_date,
    description: `Faktura ${invoice.invoice_number}${invoice.client_name ? ' · ' + invoice.client_name : ''}`,
    invoice_id: invoice.id,
    created_by: invoice.created_by ?? null,
  }
  const { data: existing } = await admin.from('transactions').select('id').eq('invoice_id', invoice.id).maybeSingle()
  if (existing) await admin.from('transactions').update(row).eq('id', existing.id)
  else await admin.from('transactions').insert(row)
}

function revalidateLinked(clientId?: string | null) {
  revalidatePath('/invoices')
  revalidatePath('/finance')
  revalidatePath('/dashboard')
  if (clientId) revalidatePath(`/crm/clients/${clientId}`)
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const clientIdRaw = formData.get('clientId') as string
  const clientId = clientIdRaw && clientIdRaw !== 'none' ? clientIdRaw : null
  let clientName = (formData.get('clientName') as string) || ''
  if (clientId) {
    const { data: cl } = await admin.from('crm_clients').select('name').eq('id', clientId).eq('tenant_id', tenantUser.tenant_id).maybeSingle()
    if (cl?.name) clientName = cl.name
  }

  const { data: inserted, error } = await admin.from('invoices').insert({
    tenant_id: tenantUser.tenant_id,
    type: formData.get('type') as string,
    status: formData.get('status') as string,
    invoice_number: formData.get('invoiceNumber') as string,
    client_name: clientName,
    client_id: clientId,
    amount: parseFloat(formData.get('amount') as string),
    currency: (formData.get('currency') as string) || 'CZK',
    issue_date: formData.get('issueDate') as string,
    due_date: formData.get('dueDate') as string,
    created_by: user.id,
  }).select('*').maybeSingle()
  if (error) throw new Error(error.message)

  await syncInvoiceTransaction(admin, inserted)
  revalidateLinked(clientId)
}

export async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
  const admin = createAdminClient()
  const { data: updated, error } = await admin.from('invoices').update({ status: newStatus }).eq('id', invoiceId).select('*').maybeSingle()
  if (error) throw new Error(error.message)
  await syncInvoiceTransaction(admin, updated)
  revalidateLinked(updated?.client_id)
}

export async function deleteInvoice(invoiceId: string) {
  const admin = createAdminClient()
  // Remove the auto-created finance transaction first, then the invoice.
  await admin.from('transactions').delete().eq('invoice_id', invoiceId)
  const { data: deleted } = await admin.from('invoices').select('client_id').eq('id', invoiceId).maybeSingle()
  const { error } = await admin.from('invoices').delete().eq('id', invoiceId)
  if (error) throw new Error(error.message)
  revalidateLinked(deleted?.client_id)
}
