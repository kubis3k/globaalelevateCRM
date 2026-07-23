'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { recordAudit } from '@/lib/audit'

// Autorizace: finance smí spravovat admin/manager (requirePermission).
const getCtx = () => requirePermission('finance.manage')

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
  const { data, error } = await c.admin.from('transactions').insert({ ...row, tenant_id: c.tenantId, created_by: c.userId }).select('id').maybeSingle()
  if (error) return { error: error.message }
  await recordAudit(c.admin, { tenantId: c.tenantId, userId: c.userId, action: 'finance.transaction.create', entity: 'transactions', entityId: data?.id, summary: `${row.type} ${row.amount} ${row.currency}`, meta: { date: row.date } })
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
  await recordAudit(c.admin, { tenantId: c.tenantId, userId: c.userId, action: 'finance.transaction.delete', entity: 'transactions', entityId: transactionId })
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

export type ImportRow = { date: string; amount: number; type: string; description: string | null }

// Bulk import of bank-statement rows (parsed + previewed client-side).
export async function importTransactions(rows: ImportRow[]): Promise<{ error?: string; count?: number }> {
  const c = await getCtx(); if ('error' in c) return c
  const clean = (rows || []).filter((r) => r && r.date && Number.isFinite(r.amount) && r.amount !== 0)
  if (!clean.length) return { error: 'Žádné platné řádky k importu.' }
  if (clean.length > 1000) return { error: 'Najednou lze importovat nejvýše 1000 řádků.' }
  const payload = clean.map((r) => ({
    tenant_id: c.tenantId, created_by: c.userId,
    type: r.type === 'income' ? 'income' : 'expense',
    amount: Math.abs(Number(r.amount)), currency: 'CZK',
    date: r.date, description: r.description || null,
  }))
  const { error } = await c.admin.from('transactions').insert(payload)
  if (error) return { error: error.message }
  await recordAudit(c.admin, { tenantId: c.tenantId, userId: c.userId, action: 'finance.transaction.import', entity: 'transactions', summary: `Import ${payload.length} transakcí` })
  refresh(); return { count: payload.length }
}
