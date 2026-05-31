'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push/webpush'

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
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }

function clientRow(fd: FormData) {
  return {
    name: str(fd, 'name'), ico: str(fd, 'ico'), dic: str(fd, 'dic'), email: str(fd, 'email'),
    phone: str(fd, 'phone'), website: str(fd, 'website'), address: str(fd, 'address'),
    owner_id: opt(fd, 'ownerId'), status: str(fd, 'status') || 'active', note: str(fd, 'note'),
  }
}

// ─── Clients ───────────────────────────────────────────────────
export async function createCrmClient(formData: FormData): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = clientRow(formData); if (!row.name) return { error: 'Zadejte název klienta.' }
  const { data, error } = await c.admin.from('crm_clients').insert({ tenant_id: c.tenantId, ...row }).select('id').maybeSingle()
  if (error) return { error: error.message }
  revalidatePath('/crm/clients'); revalidatePath('/crm'); return { id: data?.id }
}

export async function updateCrmClient(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = clientRow(formData); if (!row.name) return { error: 'Zadejte název klienta.' }
  const { error } = await c.admin.from('crm_clients').update(row).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/crm/clients'); revalidatePath(`/crm/clients/${id}`); return {}
}

export async function deleteCrmClient(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_clients').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/crm/clients'); revalidatePath('/crm'); return {}
}

// ─── Contacts ──────────────────────────────────────────────────
export async function createContact(clientId: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const name = str(formData, 'name'); if (!name) return { error: 'Zadejte jméno kontaktu.' }
  const { error } = await c.admin.from('crm_contacts').insert({
    tenant_id: c.tenantId, client_id: clientId, name,
    position: str(formData, 'position'), email: str(formData, 'email'), phone: str(formData, 'phone'),
    is_primary: formData.get('isPrimary') === 'on',
  })
  if (error) return { error: error.message }
  revalidatePath(`/crm/clients/${clientId}`); return {}
}

export async function deleteContact(id: string, clientId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_contacts').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath(`/crm/clients/${clientId}`); return {}
}

// ─── Activities ────────────────────────────────────────────────
export async function createActivity(clientId: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const subject = str(formData, 'subject'); if (!subject) return { error: 'Zadejte předmět.' }
  const { error } = await c.admin.from('crm_activities').insert({
    tenant_id: c.tenantId, client_id: clientId, type: str(formData, 'type') || 'note',
    subject, content: str(formData, 'content'), due_date: str(formData, 'dueDate'), created_by: c.userId,
  })
  if (error) return { error: error.message }
  // Notify CRM managers about new tasks that carry a deadline (best-effort).
  try {
    const due = str(formData, 'dueDate')
    if (due) {
      const { data: mgrs } = await c.admin.from('tenant_users').select('user_id')
        .eq('tenant_id', c.tenantId).in('role', ['admin', 'manager'])
      const recipients = (mgrs || []).map((r: any) => r.user_id).filter((id: string) => id && id !== c.userId)
      if (recipients.length) {
        await sendPushToUsers(c.admin, recipients, 'crm', {
          title: 'Nový CRM úkol',
          body: `${subject} • termín ${new Date(due).toLocaleDateString('cs-CZ')}`,
          url: `/crm/clients/${clientId}`,
        })
      }
    }
  } catch (e) { console.error('[push] crm activity notify failed', e) }
  revalidatePath(`/crm/clients/${clientId}`); return {}
}

export async function toggleActivity(id: string, clientId: string, done: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_activities').update({ done }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath(`/crm/clients/${clientId}`); return {}
}

export async function deleteActivity(id: string, clientId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_activities').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath(`/crm/clients/${clientId}`); return {}
}

// ─── Deals (pipeline) ──────────────────────────────────────────
export async function createDeal(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název příležitosti.' }
  const value = str(formData, 'value')
  const { error } = await c.admin.from('crm_deals').insert({
    tenant_id: c.tenantId, title, client_id: opt(formData, 'clientId'),
    value: value ? Number(value) : null, currency: str(formData, 'currency') || 'CZK',
    stage: str(formData, 'stage') || 'lead', owner_id: opt(formData, 'ownerId'),
    expected_close: str(formData, 'expectedClose'), note: str(formData, 'note'),
  })
  if (error) return { error: error.message }
  revalidatePath('/crm/pipeline'); revalidatePath('/crm'); return {}
}

export async function setDealStage(id: string, stage: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_deals').update({ stage }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/crm/pipeline'); revalidatePath('/crm'); return {}
}

export async function deleteDeal(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_deals').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/crm/pipeline'); revalidatePath('/crm'); return {}
}
