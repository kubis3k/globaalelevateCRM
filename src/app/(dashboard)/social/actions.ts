'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageSocial } from '@/lib/permissions'

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

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube', 'x', 'linkedin', 'threads', 'other']
const STATUSES = ['draft', 'scheduled', 'published', 'failed']

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const intOf = (fd: FormData, k: string) => Math.max(0, Math.round(Number(fd.get(k)) || 0))

// ── Accounts ───────────────────────────────────────────────────────────────
export async function saveAccount(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageSocial(c.role)) return { error: 'Účty může spravovat jen admin nebo manažer.' }
  const platform = str(formData, 'platform')
  if (!platform || !PLATFORMS.includes(platform)) return { error: 'Vyberte platformu.' }
  const id = str(formData, 'id')
  const followers = intOf(formData, 'followers'), following = intOf(formData, 'following'), posts = intOf(formData, 'posts_count')
  const row = {
    platform, handle: str(formData, 'handle'), display_name: str(formData, 'display_name'),
    profile_url: str(formData, 'profile_url'), followers, following, posts_count: posts,
  }
  if (id) {
    const { error } = await c.admin.from('social_accounts').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
    await c.admin.from('social_metrics').insert({ tenant_id: c.tenantId, account_id: id, followers, following, posts_count: posts })
  } else {
    const { data, error } = await c.admin.from('social_accounts').insert({ ...row, tenant_id: c.tenantId, connected_by: c.userId }).select('id').single()
    if (error) return { error: error.message }
    if (data?.id) await c.admin.from('social_metrics').insert({ tenant_id: c.tenantId, account_id: data.id, followers, following, posts_count: posts })
  }
  revalidatePath('/social'); return {}
}

// Manual live-count update → also snapshots a metric for the growth chart.
export async function recordCounts(id: string, followers: number, following: number, posts: number): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageSocial(c.role)) return { error: 'Nemáte oprávnění.' }
  const f = Math.max(0, Math.round(Number(followers) || 0))
  const g = Math.max(0, Math.round(Number(following) || 0))
  const p = Math.max(0, Math.round(Number(posts) || 0))
  const { error } = await c.admin.from('social_accounts')
    .update({ followers: f, following: g, posts_count: p, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  await c.admin.from('social_metrics').insert({ tenant_id: c.tenantId, account_id: id, followers: f, following: g, posts_count: p })
  revalidatePath('/social'); return {}
}

export async function deleteAccount(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageSocial(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('social_accounts').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/social'); return {}
}

// ── Posts ────────────────────────────────────────────────────────────────
export async function savePost(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageSocial(c.role)) return { error: 'Příspěvky může spravovat jen admin nebo manažer.' }
  const content = str(formData, 'content')
  const mediaDoc = str(formData, 'media_doc_id')
  const platforms = formData.getAll('platforms').map(String).filter((p) => PLATFORMS.includes(p))
  if (!content && !mediaDoc) return { error: 'Zadej text příspěvku nebo přilož médium.' }
  if (!platforms.length) return { error: 'Vyber alespoň jednu síť.' }
  const id = str(formData, 'id')
  const scheduledRaw = str(formData, 'scheduled_at')
  const scheduledIso = scheduledRaw ? new Date(scheduledRaw).toISOString() : null
  const status = scheduledIso ? 'scheduled' : 'draft'
  const row = {
    content, media_doc_id: mediaDoc, media_name: str(formData, 'media_name'),
    platforms, scheduled_at: scheduledIso, status,
  }
  if (id) {
    // Re-arm the cron reminder when rescheduling/editing.
    const { error } = await c.admin.from('social_posts').update({ ...row, notified_at: null, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('social_posts').insert({ ...row, tenant_id: c.tenantId, created_by: c.userId })
    if (error) return { error: error.message }
  }
  revalidatePath('/social'); return {}
}

export async function setPostStatus(id: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageSocial(c.role)) return { error: 'Nemáte oprávnění.' }
  if (!STATUSES.includes(status)) return { error: 'Neplatný stav.' }
  const patch: any = { status, updated_at: new Date().toISOString() }
  if (status === 'published') patch.published_at = new Date().toISOString()
  if (status === 'draft') { patch.scheduled_at = null; patch.notified_at = null }
  const { error } = await c.admin.from('social_posts').update(patch).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/social'); return {}
}

export async function deletePost(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageSocial(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('social_posts').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/social'); return {}
}
