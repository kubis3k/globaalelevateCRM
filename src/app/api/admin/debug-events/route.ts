import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { from } from '@/lib/db/pg-shim'

// TEMPORARY diagnostic route — replicates events/page.tsx's data path for a
// given email, bypassing session auth, to isolate why the Akce page shows 0
// rows despite matching DB rows. Remove once resolved.
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
    const user = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
    if (!user.length) return NextResponse.json({ ok: false, step: 'user', message: 'user not found' })

    const tu = await db.select().from(schema.tenantUsers).where(eq(schema.tenantUsers.user_id, user[0].id)).limit(1)
    if (!tu.length) return NextResponse.json({ ok: false, step: 'tenant_users', message: 'no tenant_users row', user: user[0] })

    const tenantId = tu[0].tenant_id

    // Exactly what events/page.tsx does, via the pg-shim.
    const shimResult = await from('events')
      .select('id, name, event_date, start_time, location, capacity, status, budget, client, client_id')
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: false, nullsFirst: false })

    // Also a raw Drizzle query for comparison, bypassing the shim entirely.
    const drizzleRows = await db.select().from(schema.events).where(eq(schema.events.tenant_id, tenantId))

    return NextResponse.json({
      ok: true,
      resolvedTenantId: tenantId,
      tenantUserRow: tu[0],
      shim: shimResult,
      drizzleRowCount: drizzleRows.length,
      drizzleRows,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message, stack: err?.stack })
  }
}
