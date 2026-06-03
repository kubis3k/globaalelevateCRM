import { requireModuleAccess } from '@/lib/supabase/tenant'
import { OrdersClient } from './orders-client'

export default async function PurchaseOrdersPage() {
  const { supabase, tenantId } = await requireModuleAccess('suppliers')
  if (!tenantId) return null

  const [{ data: orders }, { data: suppliers }, { data: events }] = await Promise.all([
    supabase.from('purchase_orders').select('*').eq('tenant_id', tenantId).order('order_date', { ascending: false }),
    supabase.from('suppliers').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('events').select('id, name, event_date').eq('tenant_id', tenantId).order('event_date', { ascending: false }).limit(200),
  ])
  const supName = (id: string | null) => (suppliers ?? []).find((s: any) => s.id === id)?.name || null
  const evName = (id: string | null) => (events ?? []).find((e: any) => e.id === id)?.name || null
  const full = (orders ?? []).map((o: any) => ({ ...o, supplier_name: supName(o.supplier_id), event_name: evName(o.event_id) }))

  return <OrdersClient orders={full} suppliers={suppliers ?? []} events={events ?? []} />
}
