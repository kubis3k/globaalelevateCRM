'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const eventData = {
    tenant_id: tenantUser.tenant_id,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    assigned_to: assigned_to && assigned_to !== 'none' ? assigned_to : null,
    assigned_role: assigned_role && assigned_role !== 'none' ? assigned_role : null,
    created_by: user.id
  }

  const { error } = await admin.from('calendar_events').insert(eventData)
  if (error) throw new Error(error.message)

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
