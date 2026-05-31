import { requireModuleAccess } from '@/lib/supabase/tenant'
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'

export default async function HrEmployeesPage() {
  await requireModuleAccess('hr')
  return <EmptyState icon={Users} title="Zaměstnanci" description="Tato sekce se právě připravuje." />
}
