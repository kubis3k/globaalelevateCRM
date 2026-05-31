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
  const { data: tu } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const cat = (fd: FormData) => { const v = str(fd, 'categoryId'); return v && v !== 'none' ? v : null }
const refresh = () => { revalidatePath('/finance'); revalidatePath('/dashboard') }

function txRow(fd: FormData) {
  return {
    type: (str(fd, 'type') || 'expense'),
    amount: parseFloat((fd.get('amount') as string) || '0') || 0,
    currency: str(fd, 'currency') || 'CZK',
    date: str(fd, 'date'),
    description: str(fd, 'description'),
    category_id: cat(fd),
  }
}

export async function createTransaction(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = txRow(formData)
  if (!row.date) return { error: 'Zadejte datum.' }
  const { error } = await c.admin.from('transactions').insert({ ...row, tenant_id: c.tenantId, created_by: c.userId })
  if (error) return { error: error.message }
  refresh(); return {}
}

export async function updateTransaction(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = txRow(formData)
  if (!row.date) return { error: 'Zadejte datum.' }
  const { error } = await c.admin.from('transactions').update(row).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  refresh(); return {}
}

export async function deleteTransaction(transactionId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('transactions').delete().eq('id', transactionId).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  refresh(); return {}
}

export async function createCategory(name: string, color?: string | null): Promise<{ id?: string; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  const n = name?.trim()
  if (!n) return { error: 'Zadejte název kategorie.' }
  // Reuse if a category with this name already exists for the tenant.
  const { data: existing } = await c.admin.from('transaction_categories').select('id').eq('tenant_id', c.tenantId).eq('name', n).maybeSingle()
  if (existing?.id) return { id: existing.id }
  const { data, error } = await c.admin.from('transaction_categories').insert({ tenant_id: c.tenantId, name: n, color: color || null }).select('id').single()
  if (error) return { error: error.message }
  refresh(); return { id: data.id }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('transaction_categories').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  refresh(); return {}
}
