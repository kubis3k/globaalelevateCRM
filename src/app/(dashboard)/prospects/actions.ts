'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  // Externí (klientský portál) nesmí na interní CRM/Obchod data. Server Action
  // je přímo volatelný POST endpoint — skrytí v navigaci není ochrana.
  if ((tu.role as string) === 'external') return { error: 'Nemáte oprávnění.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }
const opt = (fd: FormData, k: string) => { const v = str(fd, k); return v && v !== 'none' ? v : null }

const SOURCES = ['maps', 'firmy', 'rejstrik', 'referral', 'ig', 'osobni', 'jine']
const CHANNELS = ['phone', 'dm', 'email', 'osobne', 'jine']
const OUTCOMES = ['no_reply', 'replied', 'meeting', 'refused']
const STATUSES = ['new', 'contacted', 'replied', 'qualified', 'converted', 'dead', 'nurture']

const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

function prospectRow(fd: FormData) {
  const src = str(fd, 'source') || 'jine'
  const scoreRaw = Number(str(fd, 'score') || 0)
  const score = Math.min(15, Math.max(0, Number.isFinite(scoreRaw) ? Math.round(scoreRaw) : 0))
  return {
    name: str(fd, 'name'),
    ico: str(fd, 'ico'),
    dic: str(fd, 'dic'),
    region: str(fd, 'region'),
    source: SOURCES.includes(src) ? src : 'jine',
    website: str(fd, 'website'),
    email: str(fd, 'email'),
    phone: str(fd, 'phone'),
    instagram: str(fd, 'instagram'),
    score,
    owner: opt(fd, 'owner'),
    note: str(fd, 'note'),
  }
}

// ─── CRUD ──────────────────────────────────────────────────────
export async function createProspect(formData: FormData): Promise<{ error?: string; id?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = prospectRow(formData); if (!row.name) return { error: 'Zadejte název subjektu.' }
  const { data, error } = await c.admin.from('crm_prospects')
    .insert({ tenant_id: c.tenantId, ...row }).select('id').maybeSingle()
  if (error) return { error: error.message.includes('uq_prospects_ico') ? 'Prospekt s tímto IČO už existuje.' : error.message }
  revalidatePath('/prospects'); return { id: data?.id }
}

export async function updateProspect(id: string, formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const row = prospectRow(formData); if (!row.name) return { error: 'Zadejte název subjektu.' }
  const { error } = await c.admin.from('crm_prospects')
    .update({ ...row, updated_at: new Date() }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message.includes('uq_prospects_ico') ? 'Prospekt s tímto IČO už existuje.' : error.message }
  revalidatePath('/prospects'); return {}
}

export async function deleteProspect(id: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_prospects').delete().eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/prospects'); return {}
}

export async function setProspectStatus(id: string, status: string): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!STATUSES.includes(status)) return { error: 'Neplatný stav.' }
  const { error } = await c.admin.from('crm_prospects')
    .update({ status, updated_at: new Date() }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/prospects'); return {}
}

export async function assignProspectOwner(id: string, owner: string | null): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { error } = await c.admin.from('crm_prospects')
    .update({ owner: owner || null, updated_at: new Date() }).eq('id', id).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/prospects'); return {}
}

// ─── Doteky + kadence follow-upů ───────────────────────────────
// Kadence dle pořadí doteku (bez odpovědi): 1.→+3d, 2.→+4d, 3.→+7d, 4.+→nurture (+90d).
// Odpověď/schůzka → status 'replied' (kadence se ukončí). Odmítnutí → 'dead'.
export async function logTouch(
  prospectId: string, channel: string, outcome: string, note?: string,
): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (!CHANNELS.includes(channel)) return { error: 'Neplatný kanál.' }
  if (!OUTCOMES.includes(outcome)) return { error: 'Neplatný výsledek.' }

  const { data: p } = await c.admin.from('crm_prospects')
    .select('status, touch_count').eq('id', prospectId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!p) return { error: 'Prospekt nenalezen.' }

  const { error: tErr } = await c.admin.from('crm_prospect_touches').insert({
    tenant_id: c.tenantId, prospect_id: prospectId, channel, outcome,
    note: note?.trim() || null, created_by: c.userId,
  })
  if (tErr) return { error: tErr.message }

  const n = (p.touch_count || 0) + 1
  let status = p.status as string
  let nextTouch: string | null = null

  if (outcome === 'refused') {
    status = 'dead'; nextTouch = null
  } else if (outcome === 'replied' || outcome === 'meeting') {
    status = 'replied'; nextTouch = null
  } else {
    // no_reply → posun kadence
    if (n >= 4) { status = 'nurture'; nextTouch = plusDays(90) }
    else {
      nextTouch = plusDays(n === 1 ? 3 : n === 2 ? 4 : 7)
      if (status === 'new' || status === 'nurture') status = 'contacted'
    }
  }

  const { error } = await c.admin.from('crm_prospects').update({
    touch_count: n, status, next_touch_at: nextTouch, updated_at: new Date(),
  }).eq('id', prospectId).eq('tenant_id', c.tenantId)
  if (error) return { error: error.message }
  revalidatePath('/prospects'); return {}
}

// ─── Konverze prospekt → klient + příležitost ──────────────────
export async function convertProspectToClient(prospectId: string): Promise<{ error?: string; clientId?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  const { data: p } = await c.admin.from('crm_prospects')
    .select('*').eq('id', prospectId).eq('tenant_id', c.tenantId).maybeSingle()
  if (!p) return { error: 'Prospekt nenalezen.' }
  if (p.converted_client_id) return { error: 'Prospekt už byl konvertován na klienta.', clientId: p.converted_client_id }

  // 1) Klient
  const { data: client, error: cErr } = await c.admin.from('crm_clients').insert({
    tenant_id: c.tenantId, name: p.name, ico: p.ico, dic: p.dic,
    email: p.email, phone: p.phone, website: p.website,
    owner_id: p.owner, status: 'lead', note: p.note,
  }).select('id').maybeSingle()
  if (cErr || !client) return { error: cErr?.message || 'Klienta se nepodařilo vytvořit.' }

  // 2) Kontakt (přenos kontaktních údajů, pokud jsou)
  if (p.email || p.phone) {
    await c.admin.from('crm_contacts').insert({
      tenant_id: c.tenantId, client_id: client.id, name: p.name,
      email: p.email, phone: p.phone, is_primary: true,
    })
  }

  // 3) Příležitost ve fázi lead
  await c.admin.from('crm_deals').insert({
    tenant_id: c.tenantId, client_id: client.id, title: `Akvizice: ${p.name}`,
    stage: 'lead', currency: 'CZK', owner_id: p.owner,
  })

  // 4) Prospekt označit jako konvertovaný
  await c.admin.from('crm_prospects').update({
    status: 'converted', converted_client_id: client.id, next_touch_at: null,
    updated_at: new Date(),
  }).eq('id', prospectId).eq('tenant_id', c.tenantId)

  revalidatePath('/prospects'); revalidatePath('/crm'); revalidatePath('/crm/clients')
  return { clientId: client.id }
}
