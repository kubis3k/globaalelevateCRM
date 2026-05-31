'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push/webpush'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const admin = createAdminClient()

  const { data: tenantUser } = await admin
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const assigned_to = formData.get('assigned_to') as string
  const assigned_role = formData.get('assigned_role') as string
  const assigned_custom_role_id = formData.get('assigned_custom_role_id') as string

  const eventData = {
    tenant_id: tenantUser.tenant_id,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    assigned_to: assigned_to && assigned_to !== 'none' ? assigned_to : null,
    assigned_role: assigned_role && assigned_role !== 'none' ? assigned_role : null,
    assigned_custom_role_id: assigned_custom_role_id && assigned_custom_role_id !== 'none' ? assigned_custom_role_id : null,
    created_by: user.id
  }

  const { error } = await admin.from('calendar_events').insert(eventData)
  if (error) throw new Error(error.message)

  // Push to the people this event is for (best-effort; never blocks creation).
  try {
    let recipients: string[] = []
    if (eventData.assigned_to) {
      recipients = [eventData.assigned_to]
    } else if (eventData.assigned_custom_role_id) {
      const { data: rows } = await admin.from('tenant_users').select('user_id')
        .eq('tenant_id', tenantUser.tenant_id).eq('custom_role_id', eventData.assigned_custom_role_id)
      recipients = (rows || []).map((r: any) => r.user_id)
    } else if (eventData.assigned_role) {
      const { data: rows } = await admin.from('tenant_users').select('user_id')
        .eq('tenant_id', tenantUser.tenant_id).eq('role', eventData.assigned_role)
      recipients = (rows || []).map((r: any) => r.user_id)
    } else {
      const { data: rows } = await admin.from('tenant_users').select('user_id')
        .eq('tenant_id', tenantUser.tenant_id)
      recipients = (rows || []).map((r: any) => r.user_id)
    }
    recipients = recipients.filter((id) => id && id !== user.id)
    if (recipients.length) {
      const when = new Date(eventData.start_time).toLocaleString('cs-CZ', {
        day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
      })
      await sendPushToUsers(admin, recipients, 'calendar', {
        title: 'Nový úkol v kalendáři',
        body: `${eventData.title} • ${when}`,
        url: '/calendar',
      })
    }
  } catch (e) {
    console.error('[push] calendar notify failed', e)
  }

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function deleteEvent(eventId: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('calendar_events').delete().eq('id', eventId)
  if (error) throw new Error(error.message)
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}
