import { requireModuleAccess } from '@/lib/supabase/tenant'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText } from 'lucide-react'

export default async function HrDocumentsPage() {
  await requireModuleAccess('hr')
  return <EmptyState icon={FileText} title="Dokumenty" description="Tato sekce se právě připravuje." />
}
