import { requireModuleAccess } from '@/lib/supabase/tenant'
import { SuppliersClient } from './suppliers-client'

export default async function SuppliersPage() {
  const { supabase, tenantId } = await requireModuleAccess('suppliers')
  if (!tenantId) return null
  const { data: suppliers } = await supabase.from('suppliers').select('*').eq('tenant_id', tenantId).order('name')
  return <SuppliersClient suppliers={suppliers ?? []} />
}
