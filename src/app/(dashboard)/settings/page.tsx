import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('settings')
  if (!tenantId) return <NoTenantView />

  const { data: settings } = await supabase.from('company_settings').select('*').eq('tenant_id', tenantId).maybeSingle()
  const canManage = role === 'admin' || role === 'manager'

  return (
    <div className="space-y-6">
      <PageHeader title="Nastavení firmy" description="Fakturační údaje dodavatele — použijí se v nabídkách, fakturách a exportu ISDOC." />
      <SettingsClient settings={settings ?? null} canManage={canManage} />
    </div>
  )
}
