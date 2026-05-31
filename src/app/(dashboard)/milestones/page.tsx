import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageMilestones } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/page-header'
import { GoalsBoard } from '@/components/goals-board'

export default async function MilestonesPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('milestones')
  if (!tenantId) return null
  const { data } = await supabase
    .from('milestones')
    .select('id, title, description, timeframe, target_date, progress')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const canManage = canManageMilestones(role)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cíle"
        description={canManage ? 'Firemní cíle na týden, měsíc a rok.' : 'Firemní cíle na týden, měsíc a rok (spravuje management).'}
      />
      <GoalsBoard goals={data ?? []} canManage={canManage} kind="company" />
    </div>
  )
}
