import { requireModuleAccess } from '@/lib/supabase/tenant'
import { EmptyState } from '@/components/ui/empty-state'
import { Target } from 'lucide-react'

export default async function CrmPipelinePage() {
  await requireModuleAccess('crm')
  return <EmptyState icon={Target} title="Příležitosti" description="Tato sekce se právě připravuje." />
}
