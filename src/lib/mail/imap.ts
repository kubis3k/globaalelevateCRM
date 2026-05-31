import 'server-only'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export type MailConn = {
  email: string
  password: string
  imap_host: string
  imap_port: number
}

export async function withImap<T>(account: MailConn, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: account.imap_port === 993,
    auth: { user: account.email, pass: account.password },
    logger: false,
  })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }
}

export async function listFolders(client: ImapFlow) {
  const list = await client.list()
  return list
    .filter((f: any) => !f.flags?.has?.('\\Noselect'))
    .map((f: any) => ({ path: f.path, name: f.name, special: f.specialUse || null }))
}

export async function listMessages(client: ImapFlow, folder: string, limit = 40) {
  const lock = await client.getMailboxLock(folder)
  try {
    const total = (client.mailbox as any)?.exists ?? 0
    if (!total) return []
    const start = Math.max(1, total - limit + 1)
    const out: any[] = []
    for await (const m of client.fetch(`${start}:*`, { uid: true, envelope: true, flags: true, internalDate: true })) {
      const fromAddr = m.envelope?.from?.[0]
      const d: any = m.internalDate || m.envelope?.date || new Date()
      out.push({
        uid: m.uid,
        subject: m.envelope?.subject || '(bez předmětu)',
        from: fromAddr ? (fromAddr.name || fromAddr.address || '') : '',
        fromAddress: fromAddr?.address || '',
        date: d instanceof Date ? d.toISOString() : String(d),
        seen: m.flags?.has('\\Seen') ?? false,
      })
    }
    return out.reverse()
  } finally {
    lock.release()
  }
}

export async function getMessage(client: ImapFlow, folder: string, uid: number) {
  const lock = await client.getMailboxLock(folder)
  try {
    const msg = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true })
    if (!msg || !msg.source) return null
    const parsed = await simpleParser(msg.source as Buffer)
    return {
      uid,
      subject: parsed.subject || '(bez předmětu)',
      from: parsed.from?.text || '',
      to: (parsed.to as any)?.text || '',
      date: (parsed.date || new Date()).toISOString(),
      html: parsed.html || null,
      text: parsed.text || null,
      messageId: parsed.messageId || null,
      references: (parsed.references as any) || null,
      attachments: (parsed.attachments || []).map((a: any) => ({
        filename: a.filename || 'příloha',
        size: a.size,
        contentType: a.contentType,
      })),
    }
  } finally {
    lock.release()
  }
}
