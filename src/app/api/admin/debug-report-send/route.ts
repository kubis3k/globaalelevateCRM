import { NextRequest, NextResponse } from 'next/server'
import { from } from '@/lib/db/pg-shim'

// DOČASNÝ debug: izoluje proč send reportu nepersistuje. Po zjištění SMAZAT.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if ((req.headers.get('authorization') || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauth' }, { status: 401 })
  }
  const id = new URL(req.url).searchParams.get('id') || 'eb7a33a0-9a55-4113-8476-eaa5b0a58c11'
  const out: any = { id }
  out.before = await from('client_reports').select('id, status, sent_at').eq('id', id).maybeSingle()
  out.statusOnly = await from('client_reports').update({ status: 'sent' }).eq('id', id)
  out.afterStatusOnly = await from('client_reports').select('id, status, sent_at').eq('id', id).maybeSingle()
  out.isoString = await from('client_reports').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
  out.afterIso = await from('client_reports').select('id, status, sent_at').eq('id', id).maybeSingle()
  out.dateObj = await from('client_reports').update({ status: 'sent', sent_at: new Date() as any }).eq('id', id)
  out.afterDate = await from('client_reports').select('id, status, sent_at').eq('id', id).maybeSingle()
  // revert do draftu
  await from('client_reports').update({ status: 'draft', sent_at: null }).eq('id', id)
  return NextResponse.json(out)
}
