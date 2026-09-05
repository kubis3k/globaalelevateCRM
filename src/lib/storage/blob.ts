import 'server-only'
import { put, del, get as blobGet } from '@vercel/blob'

// Thin wrapper around Vercel Blob (private access — every bucket we had on
// Supabase held sensitive files: documents, HR contracts/CVs, job applications).
// Keeps the call sites that used to talk to `admin.storage.from(bucket)` simple.

// Blob store byl v tomhle projektu připojen s prefixem env proměnných `blob_`
// (malými písmeny), ne s defaultním `BLOB_`. @vercel/blob SDK ale čte jen
// `BLOB_READ_WRITE_TOKEN` (velkými) → jinak hlásí "No blob credentials found".
// Vyřešíme to explicitním předáním tokenu pod jakýmkoli prefixem.
export function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.blob_READ_WRITE_TOKEN
}

export async function putObject(
  path: string,
  body: Buffer | Uint8Array | File | Blob,
  contentType?: string,
): Promise<{ path: string; error?: undefined } | { path?: undefined; error: string }> {
  try {
    // @vercel/blob PutBody neobsahuje Uint8Array (jen Buffer/Blob/File/stream);
    // Buffer je podtyp Uint8Array, tak vše Uint8Array-like sjednotíme na Buffer.
    const putBody: Buffer | File | Blob = body instanceof Uint8Array ? Buffer.from(body) : body
    const blob = await put(path, putBody, { access: 'private', contentType, addRandomSuffix: false, token: blobToken() })
    return { path: blob.pathname }
  } catch (e: any) {
    return { error: e?.message || 'Nahrání do úložiště selhalo.' }
  }
}

export async function removeObjects(paths: (string | null | undefined)[]): Promise<void> {
  const clean = paths.filter((p): p is string => Boolean(p))
  if (!clean.length) return
  try { await del(clean, { token: blobToken() }) } catch { /* best-effort, mirrors the old Supabase rollback behavior */ }
}

// Streams a private blob back as a Response — for use in Route Handlers that
// replace what used to be a Supabase `createSignedUrl()` result.
export async function blobResponse(path: string, opts?: { filename?: string; attachment?: boolean }): Promise<Response> {
  const result = await blobGet(path, { access: 'private', token: blobToken() })
  if (!result) return new Response('Not found', { status: 404 })
  const headers = new Headers()
  headers.set('Content-Type', result.blob.contentType || 'application/octet-stream')
  headers.set('Content-Length', String(result.blob.size))
  const disposition = opts?.attachment ? 'attachment' : 'inline'
  const filename = encodeURIComponent(opts?.filename || path.split('/').pop() || 'file')
  headers.set('Content-Disposition', `${disposition}; filename="${filename}"`)
  return new Response(result.stream, { headers })
}
