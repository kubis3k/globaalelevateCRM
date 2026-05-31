import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NotesClient } from './notes-client'

export default async function PersonalNotesPage() {
  const { supabase, user, tenantId } = await requireModuleAccess('personal')
  if (!tenantId) return null
  const { data } = await supabase
    .from('personal_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  return <NotesClient notes={data ?? []} />
}
