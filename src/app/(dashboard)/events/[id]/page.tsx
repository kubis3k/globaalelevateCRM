import { notFound } from 'next/navigation'
import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageEvents } from '@/lib/permissions'
import { EventDetailClient } from './event-detail-client'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId, role } = await requireModuleAccess('events')
  if (!tenantId) return null

  const { data: event } = await supabase.from('events').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!event) notFound()

  const [{ data: lineup }, { data: timeline }] = await Promise.all([
    supabase.from('event_lineup').select('*').eq('event_id', id).eq('tenant_id', tenantId).order('slot_start', { ascending: true, nullsFirst: true }).order('sort'),
    supabase.from('event_timeline').select('*').eq('event_id', id).eq('tenant_id', tenantId).order('at_time', { ascending: true, nullsFirst: true }).order('sort'),
  ])

  let shifts: any[] = []
  if (event.event_date) {
    const { data: sh } = await supabase.from('hr_shifts').select('*').eq('tenant_id', tenantId).eq('work_date', event.event_date).order('start_time')
    const shiftIds = (sh ?? []).map((s: any) => s.id)
    const { data: assigns } = shiftIds.length ? await supabase.from('hr_shift_assignments').select('*').in('shift_id', shiftIds) : { data: [] as any[] }
    const aIds = Array.from(new Set((assigns ?? []).map((a: any) => a.user_id)))
    const { data: profiles } = aIds.length ? await supabase.from('profiles').select('id, username, full_name').in('id', aIds) : { data: [] as any[] }
    const nameOf = (uid: string) => { const p = (profiles ?? []).find((x: any) => x.id === uid); return p?.full_name || p?.username || uid.slice(0, 8) }
    shifts = (sh ?? []).map((s: any) => ({ ...s, assignments: (assigns ?? []).filter((a: any) => a.shift_id === s.id).map((a: any) => ({ ...a, name: nameOf(a.user_id) })) }))
  }

  return <EventDetailClient event={event} lineup={lineup ?? []} timeline={timeline ?? []} shifts={shifts} canManage={canManageEvents(role)} />
}
