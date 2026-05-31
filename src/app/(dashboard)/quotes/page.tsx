import { requireModuleAccess } from '@/lib/supabase/tenant'
import { QuotesClient } from './quotes-client'

export default async function QuotesPage() {
  const { supabase, tenantId } = await requireModuleAccess('quotes')
  if (!tenantId) return null

  const [{ data: quotes }, { data: clients }, { data: catalog }] = await Promise.all([
    supabase.from('quotes').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('catalog_items').select('id, name, unit_price, vat_rate, unit').eq('tenant_id', tenantId).eq('active', true).order('name'),
  ])

  return <QuotesClient quotes={quotes ?? []} clients={clients ?? []} catalog={catalog ?? []} />
}
