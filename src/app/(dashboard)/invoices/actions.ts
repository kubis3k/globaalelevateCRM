'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

// The invoice→finance transaction sync is handled by a DB trigger
// (sync_invoice_transaction): a paid invoice always has one linked transaction,
// and deleting an invoice cascades its transaction. Here we just persist the
// invoice and revalidate the affected pages.
function revalidateLinked(clientId?: string | null) {
  revalidatePath('/invoices')
  revalidatePath('/finance')
  revalidatePath('/dashboard')
  if (clientId) revalidatePath(`/crm/clients/${clientId}`)
}

async function resolveClient(admin: Admin, formData: FormData, tenantId: string) {
  const raw = formData.get('clientId') as string
  const clientId = raw && raw !== 'none' ? raw : null
  let clientName = (formData.get('clientName') as string) || ''
  if (clientId) {
    const { data: cl } = await admin.from('crm_clients').select('name').eq('id', clientId).eq('tenant_id', tenantId).maybeSingle()
    if (cl?.name) clientName = cl.name
  }
  return { clientId, clientName }
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const { clientId, clientName } = await resolveClient(admin, formData, tenantUser.tenant_id)
  const { error } = await admin.from('invoices').insert({
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
  })
  if (error) throw new Error(error.message)
  revalidateLinked(clientId)
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()
  const { data: tenantUser } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const { clientId, clientName } = await resolveClient(admin, formData, tenantUser.tenant_id)
  const { error } = await admin.from('invoices').update({
    type: formData.get('type') as string,
    status: formData.get('status') as string,
    invoice_number: formData.get('invoiceNumber') as string,
    client_name: clientName,
    client_id: clientId,
    amount: parseFloat(formData.get('amount') as string),
    currency: (formData.get('currency') as string) || 'CZK',
    issue_date: formData.get('issueDate') as string,
    due_date: formData.get('dueDate') as string,
  }).eq('id', invoiceId).eq('tenant_id', tenantUser.tenant_id)
  if (error) throw new Error(error.message)
  revalidateLinked(clientId)
}

export async function updateInvoiceStatus(invoiceId: string, newStatus: string) {
  const admin = createAdminClient()
  const { data: updated, error } = await admin.from('invoices').update({ status: newStatus }).eq('id', invoiceId).select('client_id').maybeSingle()
  if (error) throw new Error(error.message)
  revalidateLinked(updated?.client_id)
}

export async function deleteInvoice(invoiceId: string) {
  const admin = createAdminClient()
  const { data: del } = await admin.from('invoices').select('client_id').eq('id', invoiceId).maybeSingle()
  const { error } = await admin.from('invoices').delete().eq('id', invoiceId)
  if (error) throw new Error(error.message)
  revalidateLinked(del?.client_id)
}
