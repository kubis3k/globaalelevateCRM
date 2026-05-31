import { requireModuleAccess } from '@/lib/supabase/tenant'
import { EmptyState } from '@/components/ui/empty-state'
import { Clock } from 'lucide-react'

export default async function HrAttendancePage() {
  await requireModuleAccess('hr')
  return <EmptyState icon={Clock} title="Docházka" description="Tato sekce se právě připravuje." />
}
