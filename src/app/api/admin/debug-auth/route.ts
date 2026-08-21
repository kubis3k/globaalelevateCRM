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

  try {
    const ctx = await auth.$context
    const found = await ctx.internalAdapter.findUserByEmail(email)
    return NextResponse.json({ email, found: found ? { id: found.user?.id, email: found.user?.email } : null })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err), stack: err?.stack }, { status: 500 })
  }
}
