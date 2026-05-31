import { requireModuleAccess } from '@/lib/supabase/tenant'
import { TasksClient } from './tasks-client'
import { getAssignedEvents } from '../assigned'

export default async function PersonalTasksPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('personal')
  if (!tenantId) return null
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const [{ data }, assigned] = await Promise.all([
    supabase.from('personal_tasks').select('*').eq('user_id', user.id)
      .order('done', { ascending: true }).order('due_date', { ascending: true }).order('created_at', { ascending: false }),
    getAssignedEvents(supabase, tenantId, user.id, role, todayStart.toISOString()),
  ])

  return <TasksClient tasks={data ?? []} assigned={assigned} />
}
