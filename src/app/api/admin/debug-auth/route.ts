import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'

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
    return NextResponse.json({ ok: false, message: err?.message, body: err?.body })
  }
}
