'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser) throw new Error('Uživatel není přiřazen k žádné firmě.')

  const eventData = {
    tenant_id: tenantUser.tenant_id,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    assigned_to: formData.get('assigned_to') as string || null,
    created_by: user.id
  }

  const { error } = await supabase
    .from('calendar_events')
    .insert(eventData)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/calendar')
  revalidatePath('/dashboard')
}
