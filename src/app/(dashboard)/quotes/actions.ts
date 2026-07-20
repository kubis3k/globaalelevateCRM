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
const numv = (s: string | null) => (s ? Number(s.replace(',', '.')) : 0)
const r2 = (n: number) => Math.round(n * 100) / 100

// ─── Catalog ───────────────────────────────────────────────────
function catalogRow(fd: FormData) {
  return {
    kind: str(fd, 'kind') || 'service',
    name: str(fd, 'name'),
    description: str(fd, 'description'),
    unit: str(fd, 'unit') || 'ks',
    unit_price: numv(str(fd, 'unitPrice')),
    currency: str(fd, 'currency') || 'CZK',
    vat_rate: str(fd, 'vatRate') != null ? numv(str(fd, 'vatRate')) : 21,
    active: fd.get('active') === 'on',
  }
}

export async function createCatalogItem(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = catalogRow(formData); if (!row.name) return { error: 'Zadejte název položky.' }
  const { error } = await c.admin.from('catalog_items').insert({ tenant_id: c.tenantId, ...row })
  if (error) return { error: error.message }
  revalidatePath('/quotes/catalog'); return {}
}

export async function updateCatalogItem(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = catalogRow(formData); if (!row.name) return { error: 'Zadejte název položky.' }
  const { error } = await c.admin.from('catalog_items').update(row).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/quotes/catalog'); return {}
}

export async function deleteCatalogItem(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('catalog_items').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/quotes/catalog'); return {}
}

// ─── Quotes ────────────────────────────────────────────────────
export type QuoteItemInput = { description: string; quantity: number; unitPrice: number; vatRate: number; catalogItemId?: string | null }
export type QuoteInput = { number?: string; clientId?: string | null; issueDate?: string; validUntil?: string | null; currency?: string; note?: string | null; items: QuoteItemInput[] }

function computeTotals(items: QuoteItemInput[]) {
  let subtotal = 0, vat = 0
  const rows = items.map((it) => {
    const qty = Number(it.quantity) || 0
    const price = Number(it.unitPrice) || 0
    const rate = Number(it.vatRate) || 0
    const line = r2(qty * price)
    subtotal += line
    vat += (line * rate) / 100
    return { description: it.description.trim(), quantity: qty, unit_price: price, vat_rate: rate, line_total: line, catalog_item_id: it.catalogItemId || null }
  })
  subtotal = r2(subtotal); vat = r2(vat)
  return { rows, subtotal, vat_total: vat, total: r2(subtotal + vat) }
}

async function nextNumber(admin: Ctx['admin'], tenantId: string, table: string, prefix: string, extra?: (q: any) => any): Promise<string> {
  const year = new Date().getFullYear()
  let q = admin.from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('issue_date', `${year}-01-01`)
  if (extra) q = extra(q)
  const { count } = await q
  return `${prefix}-${year}-${String((count || 0) + 1).padStart(3, '0')}`
}

export async function createQuote(input: QuoteInput): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const items = (input?.items || []).filter((it) => (it.description || '').trim() && (Number(it.quantity) || 0) > 0)
  if (!items.length) return { error: 'Přidejte alespoň jednu položku.' }
  const { rows, subtotal, vat_total, total } = computeTotals(items)
  const number = (input.number || '').trim() || (await nextNumber(c.admin, c.tenantId, 'quotes', 'NAB'))
  const clientId = input.clientId && input.clientId !== 'none' ? input.clientId : null
  let clientName: string | null = null
  if (clientId) {
    const { data } = await c.admin.from('crm_clients').select('name').eq('id', clientId).eq('tenant_id', c.tenantId).maybeSingle()
    clientName = data?.name ?? null
  }
  const { data: quote, error } = await c.admin.from('quotes').insert({
    tenant_id: c.tenantId, number, client_id: clientId, client_name: clientName, status: 'draft',
    issue_date: input.issueDate || new Date().toISOString().slice(0, 10),
    valid_until: input.validUntil || null, currency: input.currency || 'CZK', note: input.note || null,
    subtotal, vat_total, total, created_by: c.userId,
  }).select('id').maybeSingle()
  if (error) return { error: error.message }
  const itemsRows = rows.map((r, i) => ({ ...r, tenant_id: c.tenantId, quote_id: quote?.id, position: i }))
  const { error: e2 } = await c.admin.from('quote_items').insert(itemsRows)
  if (e2) return { error: e2.message }
  revalidatePath('/quotes'); return { id: quote?.id }
}

export async function updateQuoteStatus(id: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  // Přechod na 'sent' orazítkuje sent_at (start hlídače nečinnosti) a re-armuje
  // připomínku (cron pak upozorní na nabídky bez reakce 7+ dní).
  const patch: Record<string, unknown> = { status }
  if (status === 'sent') { patch.sent_at = new Date().toISOString(); patch.stale_reminded_at = null }
  const { error } = await c.admin.from('quotes').update(patch).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/quotes'); return {}
}

export async function deleteQuote(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('quotes').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/quotes'); return {}
}

export async function convertQuoteToInvoice(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: quote } = await c.admin.from('quotes').select('*').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!quote) return { error: 'Nabídka nenalezena.' }
  if (quote.invoice_id) return { error: 'Nabídka už byla převedena na fakturu.' }
  const invoiceNumber = await nextNumber(c.admin, c.tenantId, 'invoices', 'FA', (q) => q.eq('type', 'issued'))
  const today = new Date()
  const due = new Date(today); due.setDate(due.getDate() + 14)
  const { data: invoice, error } = await c.admin.from('invoices').insert({
    tenant_id: c.tenantId, type: 'issued', status: 'draft', invoice_number: invoiceNumber,
    client_name: quote.client_name || '—', client_id: quote.client_id,
    amount: quote.total, currency: quote.currency,
    subtotal: quote.subtotal, vat_amount: quote.vat_total,
    vat_rate: Number(quote.subtotal) > 0 ? Math.round((Number(quote.vat_total) / Number(quote.subtotal)) * 100) : 0,
    issue_date: today.toISOString().slice(0, 10), due_date: due.toISOString().slice(0, 10),
    created_by: c.userId,
  }).select('id').maybeSingle()
  if (error) return { error: error.message }
  await c.admin.from('quotes').update({ invoice_id: invoice?.id, status: 'accepted' }).eq('id', id).eq('tenant_id', c.tenantId)
  revalidatePath('/quotes'); revalidatePath('/invoices'); revalidatePath('/finance'); revalidatePath('/dashboard'); return {}
}
