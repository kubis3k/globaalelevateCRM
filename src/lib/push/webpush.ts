import 'server-only'
import webpush from 'web-push'

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

export type PushType = 'calendar' | 'email' | 'crm' | 'hr' | 'projects'
export type PushPayload = { title: string; body: string; url?: string; tag?: string }

// Sends a push to every device of the given users that hasn't disabled this
// notification type. Prunes subscriptions the push service reports as gone.
// Best-effort: returns the count delivered; never throws.
export async function sendPushToUsers(admin: any, userIds: string[], type: PushType, payload: PushPayload, opts?: { ignorePrefs?: boolean }): Promise<number> {
  try {
    if (!ensure()) return 0
    const ids = Array.from(new Set((userIds || []).filter(Boolean)))
    if (!ids.length) return 0

    // Per-user switches; a missing prefs row means "all enabled" (default).
    let allowed = ids
    if (!opts?.ignorePrefs) {
      const { data: prefs } = await admin.from('notification_prefs').select(`user_id, ${type}`).in('user_id', ids)
      const disabled = new Set((prefs || []).filter((p: any) => p[type] === false).map((p: any) => p.user_id))
      allowed = ids.filter((id) => !disabled.has(id))
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
