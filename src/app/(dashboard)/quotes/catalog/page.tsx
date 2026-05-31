import { requireModuleAccess } from '@/lib/supabase/tenant'
import { CatalogClient } from './catalog-client'

export default async function CatalogPage() {
  const { supabase, tenantId } = await requireModuleAccess('quotes')
  if (!tenantId) return null

  const { data: items } = await supabase.from('catalog_items').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
  return <CatalogClient items={items ?? []} />
}
