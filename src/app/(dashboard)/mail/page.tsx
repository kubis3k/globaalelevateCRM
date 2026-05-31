import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageSharedMail } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/page-header'
import { MailClient } from './mail-client'

export default async function MailPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('mail')
  if (!tenantId) return null

  // Accessible accounts: shared (owner_id null) OR the user's own. Never select secret_enc.
  const { data: accounts } = await supabase
    .from('mail_accounts')
    .select('id, email, display_name, owner_id')
    .eq('tenant_id', tenantId)
    .or(`owner_id.is.null,owner_id.eq.${user.id}`)
    .order('created_at', { ascending: true })

  const list = (accounts ?? []).map((a: any) => ({
    id: a.id,
    email: a.email,
    name: a.display_name || a.email,
    shared: a.owner_id === null,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Pošta" description="Firemní e-mail propojený přes Zoho Mail (IMAP/SMTP)." />
      <MailClient accounts={list} canManageShared={canManageSharedMail(role)} />
    </div>
  )
}
