'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/context'
import { recordAudit } from '@/lib/audit'

// Autorizace: obchodní smlouvy smí spravovat admin/manager.
const getCtx = () => requirePermission('contracts.manage')

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }

function contractRow(fd: FormData) {
  const value = str(fd, 'value')
  return {
    title: str(fd, 'title'),
    party_type: str(fd, 'partyType') || 'other',
    counterparty: str(fd, 'counterparty'),
    supplier_id: opt(fd, 'supplierId'),
    client_id: opt(fd, 'clientId'),
    event_id: opt(fd, 'eventId'),
    type: str(fd, 'type'),
    status: str(fd, 'status') || 'active',
    start_date: str(fd, 'startDate'),
    end_date: str(fd, 'endDate'),
    value: value ? Number(value.replace(',', '.')) : null,
    currency: str(fd, 'currency') || 'CZK',
    document_id: opt(fd, 'documentId'),
    note: str(fd, 'note'),
  }
}

export async function createBusinessContract(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = contractRow(formData); if (!row.title) return { error: 'Zadejte název smlouvy.' }
  const { data, error } = await c.admin.from('business_contracts').insert({ tenant_id: c.tenantId, created_by: c.userId, ...row }).select('id').maybeSingle()
  if (error) return { error: error.message }
  await recordAudit(c.admin, { tenantId: c.tenantId, userId: c.userId, action: 'contracts.create', entity: 'business_contracts', entityId: data?.id, summary: row.title })
  revalidatePath('/business-contracts'); return {}
}

export async function updateBusinessContract(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = contractRow(formData); if (!row.title) return { error: 'Zadejte název smlouvy.' }
  const { error } = await c.admin.from('business_contracts').update(row).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/business-contracts'); return {}
}

export async function deleteBusinessContract(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('business_contracts').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  await recordAudit(c.admin, { tenantId: c.tenantId, userId: c.userId, action: 'contracts.delete', entity: 'business_contracts', entityId: id })
  revalidatePath('/business-contracts'); return {}
}

/** Zaznamenat e-akceptaci smlouvy protistranou (nebo ji zrušit). */
export async function toggleAcknowledged(id: string, ack: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('business_contracts').update({
    acknowledged_at: ack ? new Date().toISOString() : null,
    acknowledged_by: ack ? c.userId : null,
  }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/business-contracts'); return {}
}
