import { requireModuleAccess } from '@/lib/supabase/tenant'
import { EmptyState } from '@/components/ui/empty-state'
import { Briefcase } from 'lucide-react'

export default async function HrRecruitmentPage() {
  await requireModuleAccess('hr')
  return <EmptyState icon={Briefcase} title="Nábor" description="Tato sekce se právě připravuje." />
}
