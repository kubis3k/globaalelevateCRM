import 'server-only'
import webpush from 'web-push'
import type { ModuleId } from '@/lib/modules'

// Server-only Web Push sender. Configures VAPID lazily so a missing key (e.g.
// local dummy env) degrades to a no-op instead of crashing on import.

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@globaalelevate.com'

let configured = false
function ensure(): boolean {
  if (configured) return true
  if (!PUBLIC || !PRIVATE) return false
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE)
  configured = true
  return true
}

export type PushType = 'calendar' | 'email' | 'crm' | 'hr' | 'projects' | 'social' | 'events' | 'invoices' | 'portal' | 'meetings'
export type PushPayload = { title: string; body: string; url?: string; tag?: string }

// Each notification type belongs to a module. A push is only ever delivered to
// users who can access that module (mirrors getAllowedModules), so e.g. someone
// without the HR module never receives HR notifications.
const TYPE_MODULE: Record<PushType, ModuleId> = {
  calendar: 'calendar', email: 'mail', crm: 'crm', hr: 'hr', projects: 'projects',
  social: 'social', events: 'events', invoices: 'invoices', portal: 'portal', meetings: 'meetings',
}

// Keeps only the users who can access `moduleId`:
//   admin → all modules; no custom role → all modules; custom role → only its
//   modules (an empty modules list means "all", matching getAllowedModules).
// Degrades OPEN on a DB error (returns the input unchanged) so a transient hiccup
// can't silently drop every notification.
async function filterByModuleAccess(admin: any, ids: string[], moduleId: ModuleId): Promise<string[]> {
  try {
    const { data: tus, error } = await admin
      .from('tenant_users').select('user_id, role, custom_role_id').in('user_id', ids)
    if (error || !tus) return ids
    const roleIds = Array.from(new Set(tus.map((t: any) => t.custom_role_id).filter(Boolean)))
    const roleModules = new Map<string, string[]>()
    if (roleIds.length) {
      const { data: roles } = await admin.from('custom_roles').select('id, modules').in('id', roleIds)
      for (const r of roles || []) roleModules.set(r.id, Array.isArray(r.modules) ? r.modules : [])
    }
    const ok = new Set<string>()
    for (const t of tus as any[]) {
      if (t.role === 'admin' || !t.custom_role_id) { ok.add(t.user_id); continue }
      const mods = roleModules.get(t.custom_role_id)
      if (!mods || mods.length === 0 || mods.includes(moduleId)) ok.add(t.user_id)
    }
    return ids.filter((id) => ok.has(id))
  } catch { return ids }
}

// Sends a push to every device of the given users that hasn't disabled this
// notification type. Prunes subscriptions the push service reports as gone.
// Best-effort: returns the count delivered; never throws.
export async function sendPushToUsers(admin: any, userIds: string[], type: PushType, payload: PushPayload, opts?: { ignorePrefs?: boolean; ignoreModuleAccess?: boolean }): Promise<number> {
  try {
    if (!ensure()) return 0
    const ids = Array.from(new Set((userIds || []).filter(Boolean)))
    if (!ids.length) return 0

    // Module-access gate: only deliver to users who can access this type's module.
    let allowed = ids
    if (!opts?.ignoreModuleAccess) {
      allowed = await filterByModuleAccess(admin, allowed, TYPE_MODULE[type])
      if (!allowed.length) return 0
    }

    // Per-user switches; a missing prefs row means "all enabled" (default).
    if (!opts?.ignorePrefs) {
      const { data: prefs } = await admin.from('notification_prefs').select(`user_id, ${type}`).in('user_id', allowed)
      const disabled = new Set((prefs || []).filter((p: any) => p[type] === false).map((p: any) => p.user_id))
      allowed = allowed.filter((id) => !disabled.has(id))
    }
    if (!allowed.length) return 0

    const { data: subs } = await admin.from('push_subscriptions').select('*').in('user_id', allowed)
    if (!subs?.length) return 0

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard',
      tag: payload.tag,
    })

    let sent = 0
    const dead: string[] = []
    await Promise.all(
      subs.map(async (s: any) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data)
          sent++
        } catch (e: any) {
          const code = e?.statusCode
          if (code === 404 || code === 410) dead.push(s.endpoint)
        }
      }),
    )
    if (dead.length) await admin.from('push_subscriptions').delete().in('endpoint', dead)
    return sent
  } catch (e) {
    console.error('[push] sendPushToUsers failed', e)
    return 0
  }
}
