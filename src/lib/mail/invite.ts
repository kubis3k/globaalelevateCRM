import 'server-only'
import { decryptSecret } from './crypto'
import { sendMail } from './smtp'

// Odesílá transakční e-maily (pozvánky do portálu) přes existující SDÍLENOU
// firemní schránku (mail_accounts, owner_id IS NULL) — bez nové env proměnné,
// reuse hotové infrastruktury z modulu Pošta.
export async function sendTransactionalEmail(
  admin: any, tenantId: string, msg: { to: string; subject: string; html: string; text?: string },
): Promise<{ error?: string }> {
  const { data: acc } = await admin.from('mail_accounts').select('*').eq('tenant_id', tenantId).is('owner_id', null).order('created_at', { ascending: true }).limit(1).maybeSingle()
  if (!acc) return { error: 'Nejprve připojte firemní e-mailovou schránku (sdílenou) v modulu Pošta.' }
  try {
    await sendMail(
      {
        email: acc.email,
        password: decryptSecret(acc.secret_enc),
        imap_host: acc.imap_host,
        imap_port: acc.imap_port,
        smtp_host: acc.smtp_host,
        smtp_port: acc.smtp_port,
        display_name: acc.display_name || undefined,
      },
      { to: msg.to, subject: msg.subject, html: msg.html, text: msg.text },
    )
    return {}
  } catch (e: any) {
    return { error: `Odeslání e-mailu selhalo: ${e?.message || 'neznámá chyba'}` }
  }
}
