import 'server-only'
import nodemailer from 'nodemailer'
import { withImap, appendToSent, type MailConn } from './imap'

export type SmtpAccount = MailConn & { smtp_host: string; smtp_port: number; display_name?: string }

export async function sendMail(account: SmtpAccount, msg: {
  to: string
  cc?: string
  subject: string
  text?: string
  html?: string
  inReplyTo?: string
  references?: string
}) {
  const from = account.display_name ? `${account.display_name} <${account.email}>` : account.email
  const mailOptions: any = {
    from,
    to: msg.to,
    cc: msg.cc || undefined,
    subject: msg.subject,
    text: msg.text || undefined,
    html: msg.html || undefined,
    inReplyTo: msg.inReplyTo || undefined,
    references: msg.references || undefined,
  }

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: { user: account.email, pass: account.password },
  })
  await transporter.sendMail(mailOptions)

  // Best-effort: store a copy in the Sent folder via IMAP.
  try {
    const mod: any = await import('nodemailer/lib/mail-composer')
    const MailComposer = mod.default || mod
    const raw: Buffer = await new MailComposer(mailOptions).compile().build()
    await withImap(account, (client) => appendToSent(client, raw))
  } catch {
    /* non-fatal — the message was already sent */
  }
}
