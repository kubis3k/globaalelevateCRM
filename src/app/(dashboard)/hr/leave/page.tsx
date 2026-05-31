import { requireModuleAccess } from '@/lib/supabase/tenant'
import { EmptyState } from '@/components/ui/empty-state'
import { Plane } from 'lucide-react'

export default async function HrLeavePage() {
  await requireModuleAccess('hr')
  return <EmptyState icon={Plane} title="Dovolená a absence" description="Tato sekce se právě připravuje." />
}
