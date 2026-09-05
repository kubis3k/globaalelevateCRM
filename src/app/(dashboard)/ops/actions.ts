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
const lines = (s: string | null) => (s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

// ─── SOP / wiki articles ───────────────────────────────────────
export async function createArticle(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název.' }
  const { error } = await c.admin.from('sop_articles').insert({
    tenant_id: c.tenantId, title, category: str(formData, 'category') || 'other',
    body: str(formData, 'body'), updated_by: c.userId,
  })
  if (error) return { error: error.message }
  revalidatePath('/ops'); return {}
}

export async function updateArticle(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název.' }
  const { error } = await c.admin.from('sop_articles').update({
    title, category: str(formData, 'category') || 'other', body: str(formData, 'body'),
    updated_by: c.userId, updated_at: new Date(),
  }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ops'); return {}
}

export async function deleteArticle(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('sop_articles').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ops'); return {}
}

// ─── Checklist templates ───────────────────────────────────────
export async function saveChecklist(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const id = str(formData, 'id')
  const name = str(formData, 'name'); if (!name) return { error: 'Zadejte název checklistu.' }
  const category = str(formData, 'category') || 'other'
  const items = lines(formData.get('items') as string)
  if (!items.length) return { error: 'Přidejte alespoň jednu položku (každá na řádek).' }

  let checklistId = id
  if (id) {
    const { error } = await c.admin.from('ops_checklists').update({ name, category }).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
    await c.admin.from('ops_checklist_items').delete().eq('checklist_id', id).eq('tenant_id', c.tenantId)
  } else {
    const { data, error } = await c.admin.from('ops_checklists').insert({ tenant_id: c.tenantId, name, category, created_by: c.userId }).select('id').maybeSingle()
    if (error) return { error: error.message }
    checklistId = data?.id
  }
  const rows = items.map((label, i) => ({ tenant_id: c.tenantId, checklist_id: checklistId, label, sort: i }))
  const { error: e2 } = await c.admin.from('ops_checklist_items').insert(rows)
  if (e2) return { error: e2.message }
  revalidatePath('/ops/checklists'); return {}
}

export async function deleteChecklist(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('ops_checklists').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ops/checklists'); return {}
}

// ─── Checklist runs ────────────────────────────────────────────
export async function startRun(checklistId: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: cl } = await c.admin.from('ops_checklists').select('name').eq('id', checklistId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!cl) return { error: 'Šablona nenalezena.' }
  const { data: items } = await c.admin.from('ops_checklist_items').select('label, sort').eq('checklist_id', checklistId).order('sort')
  const { data: run, error } = await c.admin.from('ops_checklist_runs').insert({
    tenant_id: c.tenantId, checklist_id: checklistId, name: cl.name, created_by: c.userId,
  }).select('id').maybeSingle()
  if (error) return { error: error.message }
  const rows = (items || []).map((it: any) => ({ tenant_id: c.tenantId, run_id: run?.id, label: it.label, sort: it.sort }))
  if (rows.length) { const { error: e2 } = await c.admin.from('ops_checklist_run_items').insert(rows); if (e2) return { error: e2.message } }
  revalidatePath('/ops/checklists'); return {}
}

export async function toggleRunItem(itemId: string, done: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('ops_checklist_run_items').update({
    done, done_at: done ? new Date() : null, done_by: done ? c.userId : null,
  }).eq('id', itemId).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ops/checklists'); return {}
}

export async function deleteRun(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('ops_checklist_runs').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ops/checklists'); return {}
}
