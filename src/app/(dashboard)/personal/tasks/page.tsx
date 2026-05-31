import { requireModuleAccess } from '@/lib/supabase/tenant'
import { TasksClient } from './tasks-client'

export default async function PersonalTasksPage() {
  const { supabase, user, tenantId } = await requireModuleAccess('personal')
  if (!tenantId) return null
  const { data } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('done', { ascending: true })
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false })
  return <TasksClient tasks={data ?? []} />
}
