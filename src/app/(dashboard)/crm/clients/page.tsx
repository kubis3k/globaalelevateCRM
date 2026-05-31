import { requireModuleAccess } from '@/lib/supabase/tenant'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2 } from 'lucide-react'

export default async function CrmClientsPage() {
  await requireModuleAccess('crm')
  return <EmptyState icon={Building2} title="Klienti" description="Tato sekce se právě připravuje." />
}
