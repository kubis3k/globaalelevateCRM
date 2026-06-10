'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageEvents } from '@/lib/permissions'
import { sendPushToUsers } from '@/lib/push/webpush'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role as string }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }
const numOrNull = (fd: FormData, k: string) => { const v = str(fd, k); return v ? Number(v) : null }

// ── Events ───────────────────────────────────────────────────
function eventRow(fd: FormData) {
  return {
    name: str(fd, 'name'),
    event_date: str(fd, 'eventDate'),
    doors_time: str(fd, 'doorsTime'),
    start_time: str(fd, 'startTime'),
    end_time: str(fd, 'endTime'),
    location: str(fd, 'location'),
    capacity: numOrNull(fd, 'capacity'),
    client: str(fd, 'client'),
    status: str(fd, 'status') || 'planning',
    budget: numOrNull(fd, 'budget'),
    tech_notes: str(fd, 'techNotes'),
    description: str(fd, 'description'),
  }
}

const EVENT_STATUS_LABEL: Record<string, string> = { planning: 'Plánováno', confirmed: 'Potvrzeno', done: 'Proběhlo', cancelled: 'Zrušeno' }

// Everyone in the tenant except the actor; sendPushToUsers gates this down to
// users who actually have the Akce (events) module enabled.
async function eventAudience(admin: any, tenantId: string, exclude: string): Promise<string[]> {
  const { data } = await admin.from('tenant_users').select('user_id').eq('tenant_id', tenantId)
  return (data || []).map((r: any) => r.user_id).filter((u: string) => u && u !== exclude)
}

export async function saveEvent(formData: FormData): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Akce může spravovat jen admin nebo manažer.' }
  const name = str(formData, 'name'); if (!name) return { error: 'Zadej název akce.' }
  const id = opt(formData, 'id')
  const row = eventRow(formData)
  if (id) {
    const { data: prev } = await c.admin.from('events').select('status').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
    const { error } = await c.admin.from('events').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
    try {
      if (prev && row.status && prev.status !== row.status) {
        const aud = await eventAudience(c.admin, c.tenantId, c.userId)
        if (aud.length) await sendPushToUsers(c.admin, aud, 'events', { title: `Akce: ${EVENT_STATUS_LABEL[row.status] || row.status}`, body: name, url: `/events/${id}`, tag: `event-status-${id}` })
      }
    } catch (e) { console.error('[push] event status notify failed', e) }
    revalidatePath('/events'); revalidatePath(`/events/${id}`); return { id }
  }
  const { data, error } = await c.admin.from('events').insert({ ...row, tenant_id: c.tenantId, created_by: c.userId }).select('id').single()
  if (error) return { error: error.message }
  try {
    const aud = await eventAudience(c.admin, c.tenantId, c.userId)
    if (aud.length) await sendPushToUsers(c.admin, aud, 'events', { title: 'Nová akce', body: `${name}${row.event_date ? ` • ${row.event_date}` : ''}`, url: data?.id ? `/events/${data.id}` : '/events', tag: `event-${data?.id}` })
  } catch (e) { console.error('[push] new event notify failed', e) }
  revalidatePath('/events'); return { id: data?.id }
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('events').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/events'); return {}
}

// ── Line-up ──────────────────────────────────────────────────
export async function saveLineup(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const eventId = opt(formData, 'eventId'); const id = opt(formData, 'id')
  if (!id && !eventId) return { error: 'Chybí akce.' }
  const artist = str(formData, 'artist'); if (!artist) return { error: 'Zadej jméno umělce.' }
  const row = { artist, slot_start: str(formData, 'slotStart'), slot_end: str(formData, 'slotEnd'), fee: numOrNull(formData, 'fee'), status: str(formData, 'status') || 'booked', note: str(formData, 'note') }
  if (id) {
    const { error } = await c.admin.from('event_lineup').update(row).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('event_lineup').insert({ ...row, tenant_id: c.tenantId, event_id: eventId })
    if (error) return { error: error.message }
  }
  revalidatePath(`/events/${eventId || ''}`); return {}
}

export async function deleteLineup(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('event_lineup').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/events'); return {}
}

// ── Run-of-show ──────────────────────────────────────────────
export async function saveTimeline(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const eventId = opt(formData, 'eventId'); const id = opt(formData, 'id')
  if (!id && !eventId) return { error: 'Chybí akce.' }
  const item = str(formData, 'item'); if (!item) return { error: 'Zadej položku.' }
  const row = { at_time: str(formData, 'atTime'), item }
  if (id) {
    const { error } = await c.admin.from('event_timeline').update(row).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('event_timeline').insert({ ...row, tenant_id: c.tenantId, event_id: eventId })
    if (error) return { error: error.message }
  }
  revalidatePath(`/events/${eventId || ''}`); return {}
}

export async function deleteTimeline(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const { error } = await c.admin.from('event_timeline').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/events'); return {}
}

// ── VIP rezervace ────────────────────────────────────────────
export async function saveReservation(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const eventId = opt(formData, 'eventId'); const id = opt(formData, 'id')
  if (!id && !eventId) return { error: 'Chybí akce.' }
  const row = {
    box_type: str(formData, 'boxType') || 'silver', box_label: str(formData, 'boxLabel'),
    guest_name: str(formData, 'guestName'), contact: str(formData, 'contact'),
    party_size: Number(str(formData, 'partySize') || 2), min_spend: numOrNull(formData, 'minSpend'),
    deposit: numOrNull(formData, 'deposit'), status: str(formData, 'status') || 'pending', note: str(formData, 'note'),
  }
  if (id) {
    const { error } = await c.admin.from('vip_reservations').update(row).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('vip_reservations').insert({ ...row, tenant_id: c.tenantId, event_id: eventId, created_by: c.userId })
    if (error) return { error: error.message }
  }
  if (eventId) revalidatePath(`/events/${eventId}`)
  return {}
}

export async function setReservationStatus(id: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const patch: any = { status }
  if (status === 'seated') patch.arrived_at = new Date().toISOString()
  const { data, error } = await c.admin.from('vip_reservations').update(patch).eq('id', id).eq('tenant_id', c.tenantId).select('event_id').single()
  if (error) return { error: error.message }
  if (data?.event_id) revalidatePath(`/events/${data.event_id}`)
  return {}
}

export async function deleteReservation(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const { data } = await c.admin.from('vip_reservations').select('event_id').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  const { error } = await c.admin.from('vip_reservations').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  if (data?.event_id) revalidatePath(`/events/${data.event_id}`)
  return {}
}

// ── Guest list ───────────────────────────────────────────────
export async function saveGuest(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const eventId = opt(formData, 'eventId'); const id = opt(formData, 'id')
  if (!id && !eventId) return { error: 'Chybí akce.' }
  const name = str(formData, 'name'); if (!name) return { error: 'Zadej jméno hosta.' }
  const row = { name, party_size: Math.max(1, Number(str(formData, 'partySize') || 1)), type: str(formData, 'type') || 'guest', note: str(formData, 'note') }
  if (id) {
    const { error } = await c.admin.from('guest_list').update(row).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
  } else {
    const { error } = await c.admin.from('guest_list').insert({ ...row, tenant_id: c.tenantId, event_id: eventId, added_by: c.userId })
    if (error) return { error: error.message }
  }
  if (eventId) revalidatePath(`/events/${eventId}`)
  return {}
}

export async function setGuestArrived(id: string, arrived: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const { data, error } = await c.admin.from('guest_list').update({ arrived, arrived_at: arrived ? new Date().toISOString() : null }).eq('id', id).eq('tenant_id', c.tenantId).select('event_id').single()
  if (error) return { error: error.message }
  if (data?.event_id) revalidatePath(`/events/${data.event_id}`)
  return {}
}

export async function deleteGuest(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageEvents(c.role)) return { error: 'Nemáte oprávnění.' }
  const { data } = await c.admin.from('guest_list').select('event_id').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  const { error } = await c.admin.from('guest_list').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  if (data?.event_id) revalidatePath(`/events/${data.event_id}`)
  return {}
}
