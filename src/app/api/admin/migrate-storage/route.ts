import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { isNotNull } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { blobToken } from '@/lib/storage/blob'

// JEDNORÁZOVÝ migrační endpoint: zkopíruje soubory ze staré Supabase Storage do
// Vercel Blob POD STEJNOU CESTOU (blobResponse čte podle uložené storage_path,
// takže není potřeba přepisovat DB). Čte Supabase přes raw HTTP (service key je
// pořád v env; @supabase/* balík už v package.json není). Idempotentní přes
// allowOverwrite. Po ověření SMAZAT. Bearer CRON_SECRET.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  return !!secret && (req.headers.get('authorization') || '') === `Bearer ${secret}`
}

async function copyOne(bucket: string, path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { path, ok: false, err: 'missing SUPABASE env' }
  try {
    const r = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    })
    if (!r.ok) return { path, ok: false, err: `supabase ${r.status}` }
    const buf = Buffer.from(await r.arrayBuffer())
    const ct = r.headers.get('content-type') || undefined
    const blob = await put(path, buf, { access: 'private', contentType: ct, addRandomSuffix: false, allowOverwrite: true, token: blobToken() })
    return { path, ok: true, size: buf.length, blobPath: blob.pathname }
  } catch (e: any) {
    return { path, ok: false, err: e?.message ?? String(e) }
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const docs = await db.select({ p: schema.documents.storage_path }).from(schema.documents).where(isNotNull(schema.documents.storage_path))
  const hr = await db.select({ p: schema.hrDocuments.storage_path }).from(schema.hrDocuments).where(isNotNull(schema.hrDocuments.storage_path))

  const results: any[] = []
  for (const d of docs) if (d.p) results.push(await copyOne('documents', d.p))
  for (const h of hr) if (h.p) results.push(await copyOne('hr-documents', h.p))

  const ok = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  return NextResponse.json({ total: results.length, ok, failedCount: failed.length, failed })
}
