import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Externí import prospektů (scraper / n8n / ruční dávka). Auth přes
// `Authorization: Bearer <PROSPECTS_IMPORT_SECRET>`. Bez klíče → 503 (stejný
// vzor jako AI endpoint). Zápis přes service-role, dedup dle IČO nebo název+region.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SOURCES = ['maps', 'firmy', 'rejstrik', 'referral', 'ig', 'osobni', 'jine']
const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

export async function POST(req: NextRequest) {
  const secret = process.env.PROSPECTS_IMPORT_SECRET
  if (!secret) return NextResponse.json({ error: 'Import není nakonfigurován (chybí PROSPECTS_IMPORT_SECRET).' }, { status: 503 })
  if ((req.headers.get('authorization') || '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Neplatné JSON tělo.' }, { status: 400 }) }

  const tenantId = body?.tenant_id
  const list = body?.prospects
  if (!tenantId || typeof tenantId !== 'string') return NextResponse.json({ error: 'Chybí tenant_id.' }, { status: 400 })
  if (!Array.isArray(list) || list.length === 0) return NextResponse.json({ error: 'Chybí neprázdné pole prospects[].' }, { status: 400 })
  if (list.length > 500) return NextResponse.json({ error: 'Max 500 záznamů na požadavek.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: tenant } = await admin.from('tenants').select('id').eq('id', tenantId).maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Tenant nenalezen.' }, { status: 404 })

  // Existující klíče pro dedup.
  const { data: existing } = await admin.from('crm_prospects').select('ico, name, region').eq('tenant_id', tenantId)
  const icoSet = new Set<string>()
  const nameSet = new Set<string>()
  for (const e of existing || []) {
    if (e.ico) icoSet.add(String(e.ico).trim())
    nameSet.add(`${(e.name || '').toLowerCase().trim()}|${(e.region || '').toLowerCase().trim()}`)
  }

  const rows: any[] = []
  let skipped = 0
  const seenIco = new Set<string>()
  const seenName = new Set<string>()

  for (const p of list) {
    const name = clean(p?.name)
    if (!name) { skipped++; continue }
    const ico = clean(p?.ico)
    const region = clean(p?.region)
    const nameKey = `${name.toLowerCase()}|${(region || '').toLowerCase()}`

    if (ico) {
      if (icoSet.has(ico) || seenIco.has(ico)) { skipped++; continue }
      seenIco.add(ico)
    } else {
      if (nameSet.has(nameKey) || seenName.has(nameKey)) { skipped++; continue }
      seenName.add(nameKey)
    }

    const src = SOURCES.includes(p?.source) ? p.source : 'jine'
    const scoreRaw = Number(p?.score ?? 0)
    const score = Math.min(15, Math.max(0, Number.isFinite(scoreRaw) ? Math.round(scoreRaw) : 0))

    rows.push({
      tenant_id: tenantId, name, ico, region, source: src,
      website: clean(p?.website), email: clean(p?.email), phone: clean(p?.phone), instagram: clean(p?.instagram),
      score, signals: p?.signals && typeof p.signals === 'object' && !Array.isArray(p.signals) ? p.signals : {},
      note: clean(p?.note),
    })
  }

  let inserted = 0
  if (rows.length) {
    const { data, error } = await admin.from('crm_prospects').insert(rows).select('id')
    if (error) return NextResponse.json({ error: error.message, inserted: 0, skipped }, { status: 500 })
    inserted = data?.length || 0
  }

  return NextResponse.json({ ok: true, inserted, skipped })
}
