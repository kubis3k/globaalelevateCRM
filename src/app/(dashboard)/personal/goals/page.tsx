import { requireModuleAccess } from '@/lib/supabase/tenant'
import { GoalsBoard } from '@/components/goals-board'

export default async function PersonalGoalsPage() {
  const { supabase, user, tenantId } = await requireModuleAccess('personal')
  if (!tenantId) return null
  const { data } = await supabase
    .from('personal_goals')
    .select('id, title, description, timeframe, target_date, progress')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <GoalsBoard goals={data ?? []} canManage kind="personal" />
}
