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
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

// ─── Suppliers ─────────────────────────────────────────────────
function supplierRow(fd: FormData) {
  return {
    name: str(fd, 'name'),
    category: str(fd, 'category') || 'other',
    ico: str(fd, 'ico'), dic: str(fd, 'dic'),
    email: str(fd, 'email'), phone: str(fd, 'phone'), note: str(fd, 'note'),
  }
}

export async function createSupplier(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = supplierRow(formData); if (!row.name) return { error: 'Zadejte název dodavatele.' }
  const { error } = await c.admin.from('suppliers').insert({ tenant_id: c.tenantId, created_by: c.userId, ...row })
  if (error) return { error: error.message }
  revalidatePath('/suppliers'); return {}
}

export async function updateSupplier(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = supplierRow(formData); if (!row.name) return { error: 'Zadejte název dodavatele.' }
  const { error } = await c.admin.from('suppliers').update(row).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/suppliers'); return {}
}

export async function deleteSupplier(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('suppliers').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/suppliers'); return {}
}

// ─── Purchase orders ───────────────────────────────────────────
export type POItemInput = { description: string; quantity: number; unitPrice: number }
export type POInput = { number?: string; supplierId?: string | null; eventId?: string | null; orderDate?: string; expectedDate?: string | null; currency?: string; note?: string | null; items: POItemInput[] }

function computeItems(items: POItemInput[]) {
  let total = 0
  const rows = items.map((it) => {
    const qty = Number(it.quantity) || 0
    const price = Number(it.unitPrice) || 0
    const line = r2(qty * price)
    total += line
    return { description: it.description.trim(), quantity: qty, unit_price: price, line_total: line }
  })
  return { rows, total: r2(total) }
}

async function nextNumber(admin: Ctx['admin'], tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await admin.from('purchase_orders').select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId).gte('order_date', `${year}-01-01`)
  return `OBJ-${year}-${String((count || 0) + 1).padStart(3, '0')}`
}

export async function createPurchaseOrder(input: POInput): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const items = (input?.items || []).filter((it) => (it.description || '').trim() && (Number(it.quantity) || 0) > 0)
  if (!items.length) return { error: 'Přidejte alespoň jednu položku.' }
  const { rows, total } = computeItems(items)
  const number = (input.number || '').trim() || (await nextNumber(c.admin, c.tenantId))
  const { data: po, error } = await c.admin.from('purchase_orders').insert({
    tenant_id: c.tenantId, created_by: c.userId, number,
    supplier_id: input.supplierId && input.supplierId !== 'none' ? input.supplierId : null,
    event_id: input.eventId && input.eventId !== 'none' ? input.eventId : null,
    status: 'draft', order_date: input.orderDate || new Date().toISOString().slice(0, 10),
    expected_date: input.expectedDate || null, currency: input.currency || 'CZK', note: input.note || null, total,
  }).select('id').maybeSingle()
  if (error) return { error: error.message }
  const itemsRows = rows.map((r, i) => ({ ...r, tenant_id: c.tenantId, po_id: po?.id, position: i }))
  const { error: e2 } = await c.admin.from('purchase_order_items').insert(itemsRows)
  if (e2) return { error: e2.message }
  revalidatePath('/suppliers/orders'); return { id: po?.id }
}

export async function updatePOStatus(id: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('purchase_orders').update({ status }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/suppliers/orders'); return {}
}

export async function deletePurchaseOrder(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('purchase_orders').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/suppliers/orders'); return {}
}

/** Zaúčtuje objednávku jako výdaj do Financí (jednou; uloží transaction_id). */
export async function bookPurchaseOrderExpense(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: po } = await c.admin.from('purchase_orders').select('*').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!po) return { error: 'Objednávka nenalezena.' }
  if (po.transaction_id) return { error: 'Objednávka už je zaúčtovaná ve Financích.' }
  let supplierName: string | null = null
  if (po.supplier_id) {
    const { data: s } = await c.admin.from('suppliers').select('name').eq('id', po.supplier_id).maybeSingle()
    supplierName = s?.name ?? null
  }
  const { data: tx, error } = await c.admin.from('transactions').insert({
    tenant_id: c.tenantId, type: 'expense', amount: po.total, currency: po.currency,
    date: po.order_date, description: `Objednávka ${po.number}${supplierName ? ` · ${supplierName}` : ''}`,
    created_by: c.userId,
  }).select('id').maybeSingle()
  if (error) return { error: error.message }
  await c.admin.from('purchase_orders').update({ transaction_id: tx?.id, status: 'delivered' }).eq('id', id).eq('tenant_id', c.tenantId)
  revalidatePath('/suppliers/orders'); revalidatePath('/finance'); revalidatePath('/dashboard'); return {}
}
