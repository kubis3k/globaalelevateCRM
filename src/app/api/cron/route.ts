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

async function run() {
  const admin = createAdminClient()
  const mail = await pollMail(admin)
  const crm = await crmDueReminders(admin)
  return { ok: true, mail, crm }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await run())
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await run())
}
