'use server'

// Sdílené server actions pro dodávky — používá staff strana (Projekty i Akce
// detail) i klientský portál. Klient_id se odvozuje z projektu/akce (musí mít
// přiřazeného klienta v CRM, jinak dodávku nelze odeslat do portálu).

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push/webpush'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }

// ─── Staff: vytvoření/mazání dodávky (Projekty i Akce detail) ─────────────
export async function createDeliverable(formData: FormData): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const title = str(formData, 'title'); if (!title) return { error: 'Zadejte název dodávky.' }
  const projectId = opt(formData, 'projectId')
  const eventId = opt(formData, 'eventId')
  if (!projectId && !eventId) return { error: 'Chybí projekt nebo akce.' }

  let clientId: string | null = null
  if (projectId) {
    const { data: p } = await c.admin.from('projects').select('client_id').eq('id', projectId).eq('tenant_id', c.tenantId).maybeSingle()
    clientId = p?.client_id ?? null
  } else if (eventId) {
    const { data: e } = await c.admin.from('events').select('client_id').eq('id', eventId).eq('tenant_id', c.tenantId).maybeSingle()
    clientId = e?.client_id ?? null
  }
  if (!clientId) return { error: 'Projekt/akce musí mít přiřazeného klienta (CRM) — jinak nelze dodávku odeslat do portálu.' }

  const documentId = opt(formData, 'documentId')
  // Příloha musí nést stejný client_id, aby ji portál (portalDocUrl) směl vydat ke stažení.
  if (documentId) await c.admin.from('documents').update({ client_id: clientId }).eq('id', documentId).eq('tenant_id', c.tenantId)

  const { data, error } = await c.admin.from('deliverables').insert({
    tenant_id: c.tenantId, client_id: clientId, project_id: projectId, event_id: eventId,
    title, description: str(formData, 'description'), document_id: documentId,
    external_url: str(formData, 'externalUrl'), submitted_by: c.userId,
  }).select('id').single()
  if (error) return { error: error.message }

  if (projectId) revalidatePath(`/projects/${projectId}`)
  if (eventId) revalidatePath(`/events/${eventId}`)
  return { id: data?.id }
}

export async function deleteDeliverable(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: d } = await c.admin.from('deliverables').select('project_id, event_id').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  const { error } = await c.admin.from('deliverables').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  if (d?.project_id) revalidatePath(`/projects/${d.project_id}`)
  if (d?.event_id) revalidatePath(`/events/${d.event_id}`)
  return {}
}

// ─── Klient (portál): schválení / žádost o úpravu ─────────────────────────
export async function decideDeliverable(id: string, decision: 'approved' | 'changes_requested', comment?: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (decision !== 'approved' && decision !== 'changes_requested') return { error: 'Neplatné rozhodnutí.' }
  if (decision === 'changes_requested' && !comment?.trim()) return { error: 'Popište prosím, co je potřeba upravit.' }

  const { data: d } = await c.admin.from('deliverables').select('*').eq('id', id).eq('tenant_id', c.tenantId).maybeSingle()
  if (!d) return { error: 'Dodávka nenalezena.' }
  // Ověření vlastnictví: přihlášený uživatel musí mít portal_access s tímto client_id.
  const { data: access } = await c.admin.from('portal_access').select('client_id').eq('user_id', c.userId).maybeSingle()
  if (!access || access.client_id !== d.client_id) return { error: 'Nemáte přístup k této dodávce.' }
  if (d.status !== 'submitted') return { error: 'O této dodávce už bylo rozhodnuto.' }

  const { error } = await c.admin.from('deliverables').update({
    status: decision, client_comment: comment?.trim() || null, decided_by: c.userId, decided_at: new Date(),
  }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }

  // Notifikace internímu vlastníkovi (projekt) / managementu (akce bez konkrétního vlastníka).
  try {
    let recipients: string[] = []
    let channel: 'projects' | 'crm' = 'crm'
    let url = '/documents'
    if (d.project_id) {
      const { data: p } = await c.admin.from('projects').select('owner_id').eq('id', d.project_id).maybeSingle()
      channel = 'projects'; url = `/projects/${d.project_id}`
      recipients = p?.owner_id ? [p.owner_id] : []
    }
    if (!recipients.length) {
      const { data: mgrs } = await c.admin.from('tenant_users').select('user_id').eq('tenant_id', c.tenantId).in('role', ['admin', 'manager'])
      recipients = (mgrs || []).map((r: any) => r.user_id)
      if (d.event_id) url = `/events/${d.event_id}`
    }
    if (recipients.length) {
      await sendPushToUsers(c.admin, recipients, channel, {
        title: decision === 'approved' ? 'Dodávka schválena klientem' : 'Klient žádá úpravu dodávky',
        body: d.title,
        url,
      })
    }
  } catch (e) { console.error('[push] deliverable decision notify failed', e) }

  revalidatePath('/portal/deliverables')
  return {}
}
