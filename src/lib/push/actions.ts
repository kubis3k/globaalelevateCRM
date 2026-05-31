'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from './webpush'

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

type WebSub = { endpoint: string; keys?: { p256dh?: string; auth?: string } }

export async function subscribeUser(sub: WebSub): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { error: 'Neplatná subscription.' }
  let ua = ''
  try { ua = (await headers()).get('user-agent') || '' } catch { /* ignore */ }
  const { error } = await c.admin.from('push_subscriptions').upsert({
    tenant_id: c.tenantId,
    user_id: c.userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: ua.slice(0, 300),
  }, { onConflict: 'endpoint' })
  if (error) return { error: error.message }
  return {}
}

export async function unsubscribeUser(endpoint: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!endpoint) return {}
  await c.admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', c.userId)
  return {}
}

export type Prefs = { calendar: boolean; email: boolean; crm: boolean; hr: boolean }

export async function getNotificationPrefs(): Promise<Prefs> {
  const c = await getCtx(); if ('error' in c) return { calendar: true, email: true, crm: true, hr: true }
  const { data } = await c.admin.from('notification_prefs').select('calendar, email, crm, hr').eq('user_id', c.userId).maybeSingle()
  return {
    calendar: data?.calendar ?? true,
    email: data?.email ?? true,
    crm: data?.crm ?? true,
    hr: data?.hr ?? true,
  }
}

export async function saveNotificationPrefs(prefs: Prefs): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('notification_prefs').upsert({
    user_id: c.userId,
    tenant_id: c.tenantId,
    calendar: !!prefs.calendar,
    email: !!prefs.email,
    crm: !!prefs.crm,
    hr: !!prefs.hr,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) return { error: error.message }
  return {}
}

export async function sendTestNotification(): Promise<{ error?: string; sent?: number }> {
  const c = await getCtx(); if ('error' in c) return c
  const sent = await sendPushToUsers(c.admin, [c.userId], 'calendar', {
    title: 'Globaal Elevate',
    body: 'Testovací notifikace — funguje! 🎉',
    url: '/dashboard',
    tag: 'test',
  }, { ignorePrefs: true })
  if (!sent) return { error: 'Žádné zařízení nepřijalo notifikaci. Zkontroluj, že jsou notifikace povolené.' }
  return { sent }
}
