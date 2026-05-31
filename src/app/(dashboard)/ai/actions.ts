'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role as string }
}

const canManage = (c: Ctx, convo: { owner_id: string | null; created_by: string | null }) =>
  convo.owner_id ? convo.owner_id === c.userId
    : (convo.created_by === c.userId || c.role === 'admin' || c.role === 'manager')

async function loadConvo(c: Ctx, id: string) {
  const { data } = await c.admin.from('ai_conversations').select('id, owner_id, created_by').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  return data as { id: string; owner_id: string | null; created_by: string | null } | null
}

export async function createConversation(shared: boolean): Promise<{ id?: string; error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data, error } = await c.admin.from('ai_conversations').insert({
    tenant_id: c.tenantId,
    owner_id: shared ? null : c.userId,
    created_by: c.userId,
    title: null,
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/ai')
  return { id: data.id }
}

export async function getMessages(conversationId: string): Promise<{ messages?: { role: string; content: string }[]; error?: string }> {
  const c = await getCtx(); if ('error' in c) return { error: c.error }
  const convo = await loadConvo(c, conversationId)
  if (!convo) return { error: 'Konverzace nenalezena.' }
  if (convo.owner_id && convo.owner_id !== c.userId) return { error: 'Nemáte přístup.' }
  const { data } = await c.admin.from('ai_messages').select('role, content').eq('conversation_id', conversationId).order('created_at', { ascending: true })
  return { messages: (data as any) || [] }
}

export async function renameConversation(id: string, title: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const convo = await loadConvo(c, id)
  if (!convo) return { error: 'Konverzace nenalezena.' }
  if (!canManage(c, convo)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('ai_conversations').update({ title: title.slice(0, 80) }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ai')
  return {}
}

export async function setShared(id: string, shared: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const convo = await loadConvo(c, id)
  if (!convo) return { error: 'Konverzace nenalezena.' }
  if (!canManage(c, convo)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('ai_conversations').update({ owner_id: shared ? null : c.userId }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ai')
  return {}
}

export async function deleteConversation(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const convo = await loadConvo(c, id)
  if (!convo) return { error: 'Konverzace nenalezena.' }
  if (!canManage(c, convo)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('ai_conversations').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/ai')
  return {}
}
