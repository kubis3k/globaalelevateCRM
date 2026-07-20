import { NextResponse } from 'next/server'
import { getUctoSummary } from '@/lib/ucto'

// Diagnostika propojení s účtem — jen stavové informace, žádná čísla.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const hasEnv = !!process.env.UCTO_DATABASE_URL
  const res = await getUctoSummary()
  return NextResponse.json({
    hasEnv,
    connected: res.connected,
    reason: res.connected ? null : res.reason.slice(0, 200),
  })
}
