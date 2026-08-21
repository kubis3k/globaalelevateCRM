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

  if (req.nextUrl.searchParams.get('mode') === 'roundtrip') {
    const ctx = await auth.$context
    const hash = await ctx.password.hash(password)
    const verifiesSelf = await ctx.password.verify({ hash, password })
    const found = await ctx.internalAdapter.findUserByEmail(email)
    const account = found ? await ctx.internalAdapter.findAccounts(found.user.id) : null
    const cred = account?.find((a: any) => a.providerId === 'credential')
    const verifiesStored = cred?.password ? await ctx.password.verify({ hash: cred.password, password }) : null
    return NextResponse.json({
      selfHashLen: hash.length,
      verifiesSelf,
      userId: found?.user?.id,
      accounts: account?.map((a: any) => ({ providerId: a.providerId, accountId: a.accountId, hasPassword: !!a.password, passwordLen: a.password?.length })),
      storedPasswordPrefix: cred?.password?.slice(0, 20),
      verifiesStored,
    })
  }

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
