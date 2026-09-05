'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string | null }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const canReview = (role: string | null) => role === 'admin' || role === 'manager'

export async function createExpense(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const amountStr = str(formData, 'amount')
  const amount = amountStr ? Number(amountStr.replace(',', '.')) : 0
  const date = str(formData, 'expenseDate')
  if (!amount || amount <= 0) return { error: 'Zadejte částku větší než 0.' }
  if (!date) return { error: 'Zadejte datum.' }
  const { error } = await c.admin.from('expense_claims').insert({
    tenant_id: c.tenantId, user_id: c.userId, expense_date: date, amount,
    currency: str(formData, 'currency') || 'CZK', category: str(formData, 'category'),
    description: str(formData, 'description'), status: 'pending',
  })
  if (error) return { error: error.message }
  revalidatePath('/expenses'); return {}
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  let q = c.admin.from('expense_claims').delete().eq('id', id).eq('tenant_id', c.tenantId).eq('status', 'pending')
  if (!canReview(c.role)) q = q.eq('user_id', c.userId)
  const { error } = await q
  if (error) return { error: error.message }
  revalidatePath('/expenses'); return {}
}

export async function reviewExpense(id: string, approve: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canReview(c.role)) return { error: 'Schvalovat může jen administrátor nebo manažer.' }
  const { data: claim } = await c.admin.from('expense_claims').select('*').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!claim) return { error: 'Výdaj nenalezen.' }
  if (claim.status !== 'pending') return { error: 'Tento výdaj už byl vyřízen.' }

  if (approve) {
    const { data: prof } = await c.admin.from('profiles').select('full_name, username').eq('id', claim.user_id).maybeSingle()
    const who = prof?.full_name || prof?.username || ''
    const { data: tx } = await c.admin.from('transactions').insert({
      tenant_id: c.tenantId, type: 'expense', amount: claim.amount, currency: claim.currency,
      date: claim.expense_date,
      description: `Výdaj: ${claim.description || claim.category || 'proplacení'}${who ? ` (${who})` : ''}`,
      created_by: c.userId,
    }).select('id').maybeSingle()
    const { error } = await c.admin.from('expense_claims').update({
      status: 'approved', reviewed_by: c.userId, reviewed_at: new Date(), transaction_id: tx?.id,
    }).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/expenses'); revalidatePath('/finance'); revalidatePath('/dashboard'); return {}
  }

  const { error } = await c.admin.from('expense_claims').update({
    status: 'rejected', reviewed_by: c.userId, reviewed_at: new Date(),
  }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/expenses'); return {}
}
