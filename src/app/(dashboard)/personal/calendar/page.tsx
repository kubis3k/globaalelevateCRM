import { requireModuleAccess } from '@/lib/supabase/tenant'
import { PersonalCalendarClient } from './calendar-client'

export default async function PersonalCalendarPage() {
  const { supabase, user, tenantId } = await requireModuleAccess('personal')
  if (!tenantId) return null
  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  const { data } = await supabase
    .from('personal_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', since.toISOString())
    .order('start_time', { ascending: true })
  return <PersonalCalendarClient events={data ?? []} />
}
