import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { auth } from '@/lib/auth/auth'

// Jednorázová migrace: Supabase Auth hesla (bcrypt) se nepřenesla (jiný hash
// formát než Better-Auth) — po cutoveru dá všem stávajícím uživatelům bez
// credential účtu stejné dočasné heslo a vynutí změnu při přihlášení.
// Zavolat jednou po deployi (Bearer CRON_SECRET), pak lze nechat ležet mrtvé.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TEMP_PASSWORD = 'Globaal43!'

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const allUsers = await db.select().from(schema.users)
  const existingAccounts = await db.select({ userId: schema.account.userId }).from(schema.account).where(eq(schema.account.providerId, 'credential'))
  const hasCredential = new Set(existingAccounts.map((a) => a.userId))

  const ctx = await auth.$context
  const passwordHash = await ctx.password.hash(TEMP_PASSWORD)
  const now = new Date()
  const seeded: string[] = []

  for (const u of allUsers) {
    if (hasCredential.has(u.id)) continue
    await db.insert(schema.account).values({
      id: randomUUID(),
      userId: u.id,
      accountId: u.email,
      providerId: 'credential',
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    })
    await db.update(schema.users).set({ mustChangePassword: true }).where(eq(schema.users.id, u.id))
    seeded.push(u.email)
  }

  return NextResponse.json({ seeded, tempPassword: TEMP_PASSWORD, count: seeded.length })
}
