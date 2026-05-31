import { requireModuleAccess } from '@/lib/supabase/tenant'
import { PersonalCalendarClient } from './calendar-client'
import { getAssignedEvents } from '../assigned'

export default async function PersonalCalendarPage() {
  const { supabase, user, tenantId, role, customRoleId } = await requireModuleAccess('personal')
  if (!tenantId) return null
  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  const sinceISO = since.toISOString()

  const [{ data: events }, assigned] = await Promise.all([
    supabase.from('personal_events').select('*').eq('user_id', user.id).gte('start_time', sinceISO).order('start_time', { ascending: true }),
    getAssignedEvents(supabase, tenantId, user.id, role, customRoleId, sinceISO),
  ])

  return <PersonalCalendarClient events={events ?? []} shared={assigned} />
}
