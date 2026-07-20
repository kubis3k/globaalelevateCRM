import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/mail/crypto'
import { withImap, listMessages } from '@/lib/mail/imap'
import { sendPushToUsers } from '@/lib/push/webpush'

// Background poller — invoked on a schedule by Supabase pg_cron (pg_net http_post)
// with `Authorization: Bearer <CRON_SECRET>`. Detects new mail per account and
// fires CRM due-date reminders. Node runtime (imapflow needs Node, not Edge).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}

async function upsertState(admin: any, accountId: string, lastUid: number | null) {
  await admin.from('mail_poll_state').upsert(
    { account_id: accountId, last_uid: lastUid, last_checked_at: new Date().toISOString() },
    { onConflict: 'account_id' },
  )
}

async function mailRecipients(admin: any, acc: any): Promise<string[]> {
  if (acc.owner_id) return [acc.owner_id]
  // Shared mailbox → notify admins + managers of that tenant.
  const { data: mgrs } = await admin.from('tenant_users').select('user_id')
    .eq('tenant_id', acc.tenant_id).in('role', ['admin', 'manager'])
  return (mgrs || []).map((r: any) => r.user_id)
}

async function pollMail(admin: any) {
  const { data: accounts } = await admin.from('mail_accounts').select('*')
  if (!accounts?.length) return { checked: 0, notified: 0 }
  let notified = 0
  for (const acc of accounts) {
    try {
      const { data: state } = await admin.from('mail_poll_state').select('last_uid').eq('account_id', acc.id).maybeSingle()
      const lastUid: number | null = state?.last_uid ?? null
      const conn = { email: acc.email, password: decryptSecret(acc.secret_enc), imap_host: acc.imap_host, imap_port: acc.imap_port }
      const msgs: any[] = await withImap(conn, (client) => listMessages(client, 'INBOX', 30))
      if (!msgs.length) { await upsertState(admin, acc.id, lastUid); continue }
      const maxUid = Math.max(...msgs.map((m: any) => m.uid))
      if (lastUid == null) {
        // First run for this account: baseline only, don't spam about old mail.
        await upsertState(admin, acc.id, maxUid)
        continue
      }
      const fresh = msgs.filter((m: any) => m.uid > lastUid).sort((a: any, b: any) => a.uid - b.uid)
      if (fresh.length) {
        const recipients = await mailRecipients(admin, acc)
        if (recipients.length) {
          for (const m of fresh.slice(-5)) {
            notified += await sendPushToUsers(admin, recipients, 'email', {
              title: acc.owner_id ? 'Nový e-mail' : `Nový e-mail · ${acc.display_name || acc.email}`,
              body: `${m.from || m.fromAddress || ''}: ${m.subject || '(bez předmětu)'}`.slice(0, 180),
              url: '/mail',
              tag: `mail-${acc.id}-${m.uid}`,
            })
          }
        }
      }
      await upsertState(admin, acc.id, Math.max(maxUid, lastUid))
    } catch (e) {
      console.error('[cron] mail poll failed for account', acc.id, e)
    }
  }
  return { checked: accounts.length, notified }
}

async function crmDueReminders(admin: any) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: acts } = await admin.from('crm_activities')
    .select('id, tenant_id, client_id, subject, due_reminded_at')
    .eq('due_date', today).eq('done', false)
  if (!acts?.length) return { reminded: 0 }
  let reminded = 0
  for (const a of acts) {
    if (a.due_reminded_at === today) continue
    const { data: mgrs } = await admin.from('tenant_users').select('user_id')
      .eq('tenant_id', a.tenant_id).in('role', ['admin', 'manager'])
    const recipients = (mgrs || []).map((r: any) => r.user_id)
    if (recipients.length) {
      reminded += await sendPushToUsers(admin, recipients, 'crm', {
        title: 'CRM úkol má dnes termín',
        body: a.subject,
        url: `/crm/clients/${a.client_id}`,
        tag: `crm-due-${a.id}`,
      })
    }
    await admin.from('crm_activities').update({ due_reminded_at: today }).eq('id', a.id)
  }
  return { reminded }
}

// Scheduled social posts whose time has come → notify managers (once) so the
// post gets published. When per-platform API tokens are connected this is also
// where auto-posting hooks in; until then it's a reliable publish reminder.
async function socialDuePosts(admin: any) {
  const nowIso = new Date().toISOString()
  const { data: posts } = await admin.from('social_posts')
    .select('id, tenant_id, content, platforms, scheduled_at')
    .eq('status', 'scheduled').lte('scheduled_at', nowIso).is('notified_at', null)
  if (!posts?.length) return { notified: 0 }
  let notified = 0
  for (const p of posts) {
    const { data: mgrs } = await admin.from('tenant_users').select('user_id')
      .eq('tenant_id', p.tenant_id).in('role', ['admin', 'manager'])
    const recipients = (mgrs || []).map((r: any) => r.user_id)
    if (recipients.length) {
      const nets = Array.isArray(p.platforms) ? p.platforms.join(', ') : ''
      notified += await sendPushToUsers(admin, recipients, 'social', {
        title: 'Naplánovaný příspěvek je připraven',
        body: `${nets ? nets + ' · ' : ''}${p.content || 'Příspěvek'}`.slice(0, 180),
        url: '/social',
        tag: `social-${p.id}`,
      })
    }
    await admin.from('social_posts').update({ notified_at: nowIso }).eq('id', p.id)
  }
  return { notified }
}

// HR compliance: notify managers about contracts/dohody expiring within 14 days
// (once each, guarded by expiry_reminded_at).
async function hrContractReminders(admin: any) {
  const today = new Date().toISOString().slice(0, 10)
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const { data: cts } = await admin.from('hr_contracts')
    .select('id, tenant_id, title, end_date, expiry_reminded_at')
    .eq('status', 'active').not('end_date', 'is', null).gte('end_date', today).lte('end_date', in14)
  if (!cts?.length) return { reminded: 0 }
  let reminded = 0
  for (const ct of cts) {
    if (ct.expiry_reminded_at === today) continue
    const { data: mgrs } = await admin.from('tenant_users').select('user_id')
      .eq('tenant_id', ct.tenant_id).in('role', ['admin', 'manager'])
    const recipients = (mgrs || []).map((r: any) => r.user_id)
    if (recipients.length) {
      reminded += await sendPushToUsers(admin, recipients, 'hr', {
        title: 'Smlouva brzy vyprší',
        body: `${ct.title || 'Smlouva'} — platnost do ${ct.end_date}`,
        url: '/hr/contracts',
        tag: `hr-contract-${ct.id}`,
      })
    }
    await admin.from('hr_contracts').update({ expiry_reminded_at: today }).eq('id', ct.id)
  }
  return { reminded }
}

// HR: notify managers about certifications expiring within 30 days (once each).
async function hrTrainingReminders(admin: any) {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const { data: ts } = await admin.from('hr_trainings').select('id, tenant_id, name, expires_on, reminded_on')
    .not('expires_on', 'is', null).gte('expires_on', today).lte('expires_on', in30)
  if (!ts?.length) return { reminded: 0 }
  let reminded = 0
  for (const t of ts) {
    if (t.reminded_on === today) continue
    const { data: mgrs } = await admin.from('tenant_users').select('user_id').eq('tenant_id', t.tenant_id).in('role', ['admin', 'manager'])
    const recipients = (mgrs || []).map((r: any) => r.user_id)
    if (recipients.length) reminded += await sendPushToUsers(admin, recipients, 'hr', { title: 'Končící certifikace', body: `${t.name} — platí do ${t.expires_on}`, url: '/hr/training', tag: `hr-train-${t.id}` })
    await admin.from('hr_trainings').update({ reminded_on: today }).eq('id', t.id)
  }
  return { reminded }
}

const czkFmt = (n: any) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(Number(n || 0))

async function managersOf(admin: any, tenantId: string): Promise<string[]> {
  const { data } = await admin.from('tenant_users').select('user_id').eq('tenant_id', tenantId).in('role', ['admin', 'manager'])
  return (data || []).map((r: any) => r.user_id)
}

// Denní akviziční digest: prospekti s next_touch_at <= dnes (mimo converted/dead),
// seskupené dle ownera (bez ownera → management). Jeden souhrnný push (typ crm)
// na skupinu. Guard digest_notified_at, aby se v rámci dne neopakoval.
async function prospectDigest(admin: any) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: due } = await admin.from('crm_prospects')
    .select('id, tenant_id, name, score, owner, next_touch_at, status, digest_notified_at')
    .not('next_touch_at', 'is', null).lte('next_touch_at', today)
  const pending = (due || []).filter((p: any) => !['converted', 'dead'].includes(p.status) && p.digest_notified_at !== today)
  if (!pending.length) return { notified: 0 }

  const groups = new Map<string, any[]>()
  for (const p of pending) {
    const key = `${p.tenant_id}::${p.owner || ''}`
    const arr = groups.get(key) || []
    arr.push(p); groups.set(key, arr)
  }

  const mgrCache = new Map<string, string[]>()
  let notified = 0
  const doneIds: string[] = []
  for (const [key, list] of groups) {
    const [tenantId, owner] = key.split('::')
    let recipients: string[]
    if (owner) recipients = [owner]
    else {
      if (!mgrCache.has(tenantId)) mgrCache.set(tenantId, await managersOf(admin, tenantId))
      recipients = mgrCache.get(tenantId) as string[]
    }
    if (recipients.length) {
      const top = [...list].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3).map((p) => p.name)
      notified += await sendPushToUsers(admin, recipients, 'crm', {
        title: 'Akvizice — follow-up',
        body: `Dnes kontaktuj ${list.length} ${list.length === 1 ? 'prospekta' : 'prospektů'} (top: ${top.join(', ')})`,
        url: '/prospects',
        tag: `prospect-digest-${key}-${today}`,
      })
    }
    for (const p of list) doneIds.push(p.id)
  }
  if (doneIds.length) await admin.from('crm_prospects').update({ digest_notified_at: today }).in('id', doneIds)
  return { notified }
}

// Odeslané nabídky bez reakce 7+ dní → připomínka managementu (jednou, guard
// stale_reminded_at).
async function staleQuotes(admin: any) {
  const today = new Date().toISOString().slice(0, 10)
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: qs } = await admin.from('quotes')
    .select('id, tenant_id, number, client_name, total, sent_at, stale_reminded_at, status')
    .eq('status', 'sent').not('sent_at', 'is', null).lte('sent_at', cutoff).is('stale_reminded_at', null)
  if (!qs?.length) return { reminded: 0 }
  let reminded = 0
  for (const q of qs) {
    const recipients = await managersOf(admin, q.tenant_id)
    if (recipients.length) {
      reminded += await sendPushToUsers(admin, recipients, 'crm', {
        title: 'Nabídka čeká na odpověď',
        body: `${q.number} — ${q.client_name || 'klient'} · ${czkFmt(q.total)} · 7+ dní bez reakce`,
        url: '/quotes',
        tag: `quote-stale-${q.id}`,
      })
    }
    await admin.from('quotes').update({ stale_reminded_at: today }).eq('id', q.id)
  }
  return { reminded }
}

async function run() {
  const admin = createAdminClient()
  const mail = await pollMail(admin)
  const crm = await crmDueReminders(admin)
  const social = await socialDuePosts(admin)
  const hr = await hrContractReminders(admin)
  const training = await hrTrainingReminders(admin)
  const prospects = await prospectDigest(admin)
  const quotes = await staleQuotes(admin)
  return { ok: true, mail, crm, social, hr, training, prospects, quotes }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await run())
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await run())
}
