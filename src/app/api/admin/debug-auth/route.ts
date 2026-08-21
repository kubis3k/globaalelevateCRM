import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'

// Dočasný diagnostický endpoint (Neon/Better-Auth cutover) — smaž po vyřešení
// "User not found" na přihlášení. Bearer CRON_SECRET.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const email = req.nextUrl.searchParams.get('email') || 'jakub.lucan@globaalelevate.com'
  const password = req.nextUrl.searchParams.get('password') || 'Globaal43!'

  try {
    const result = await auth.api.signInEmail({ body: { email, password } })
    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      message: err?.message,
      name: err?.name,
      status: err?.status,
      statusCode: err?.statusCode,
      body: err?.body,
      cause: err?.cause?.message,
      stack: err?.stack,
    }, { status: 200 })
  }
}
