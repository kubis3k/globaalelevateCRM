'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push/webpush'
import { canManageMeetings } from '@/lib/permissions'

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
const toIso = (local: string | null) => { if (!local) return null; const d = new Date(local); return isNaN(d.getTime()) ? null : d.toISOString() }

function meetingRow(fd: FormData) {
  return {
    title: str(fd, 'title'),
    starts_at: toIso(str(fd, 'startsAt')),
    ends_at: toIso(str(fd, 'endsAt')),
    location: str(fd, 'location'),
    attendees: str(fd, 'attendees'),
    agenda: str(fd, 'agenda'),
    status: str(fd, 'status') || 'scheduled',
  }
}

export async function saveMeeting(formData: FormData): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = meetingRow(formData)
  if (!row.title) return { error: 'Zadej název meetingu.' }
  if (!row.starts_at) return { error: 'Zadej datum a čas začátku.' }
  const id = str(formData, 'id')
  if (id) {
    const { error } = await c.admin.from('meetings').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
    if (error) return { error: error.message }
    revalidatePath('/meetings'); return { id }
  }
  const { data, error } = await c.admin.from('meetings').insert({ ...row, tenant_id: c.tenantId, created_by: c.userId }).select('id').maybeSingle()
  if (error) return { error: error.message }
  // Notify the team (best-effort) — gated to users with the Meetingy module.
  try {
    const startsRaw = str(formData, 'startsAt') || ''
    const when = startsRaw.replace('T', ' ').slice(0, 16)
    const { data: members } = await c.admin.from('tenant_users').select('user_id').eq('tenant_id', c.tenantId)
    const recipients = (members || []).map((r: any) => r.user_id).filter((u: string) => u && u !== c.userId)
    if (recipients.length) await sendPushToUsers(c.admin, recipients, 'meetings', {
      title: 'Nový meeting',
      body: `${row.title}${when ? ` • ${when}` : ''}`,
      url: '/meetings',
      tag: `meeting-${data?.id}`,
    })
  } catch (e) { console.error('[push] new meeting notify failed', e) }
  revalidatePath('/meetings'); return { id: data?.id }
}

export async function saveMeetingNotes(id: string, notes: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('meetings').update({ notes: notes ?? null, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/meetings'); return {}
}

export async function setMeetingStatus(id: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('meetings').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/meetings'); return {}
}

export async function deleteMeeting(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!canManageMeetings(c.role)) return { error: 'Meeting může smazat jen admin nebo manažer.' }
  const { error } = await c.admin.from('meetings').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/meetings'); return {}
}

export async function addActionItem(meetingId: string, text: string, assignee?: string | null): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const t = (text || '').trim(); if (!t) return { error: 'Zadej úkol.' }
  const { error } = await c.admin.from('meeting_action_items').insert({
    tenant_id: c.tenantId, meeting_id: meetingId, text: t, assignee: (assignee || '').trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/meetings'); return {}
}

export async function toggleActionItem(id: string, done: boolean): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('meeting_action_items').update({ done }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/meetings'); return {}
}

export async function deleteActionItem(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('meeting_action_items').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/meetings'); return {}
}
