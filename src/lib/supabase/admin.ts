import { createClient as createSupabaseJs } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { auth } from '@/lib/auth/auth'
import { from } from '@/lib/db/pg-shim'

// `.from()` a `.auth.admin.*` jdou přes Neon/Drizzle + Better-Auth (viz
// server.ts). `.storage` zůstává na reálném Supabase service-role klientovi —
// Storage se na Vercel Blob přesouvá jako samostatný navazující krok, do té
// doby zůstávají soubory (dokumenty, HR přílohy, CV) beze změny na Supabase.
const storageClient = createSupabaseJs(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export function createAdminClient() {
  return {
    from,
    storage: storageClient.storage,
    auth: {
      admin: {
        async createUser(opts: { email: string; password: string; email_confirm?: boolean }) {
          try {
            const existing = await db.select().from(schema.users).where(eq(schema.users.email, opts.email)).limit(1)
            if (existing.length) return { data: { user: null }, error: { message: 'already registered' } }

            const ctx = await auth.$context
            const passwordHash = await ctx.password.hash(opts.password)
            const userId = randomUUID()
            const now = new Date()
            await db.insert(schema.users).values({
              id: userId,
              email: opts.email,
              name: opts.email.split('@')[0],
              emailVerified: opts.email_confirm ?? true,
              createdAt: now,
              updatedAt: now,
            })
            await db.insert(schema.account).values({
              id: randomUUID(),
              userId,
              accountId: userId, // Better-Auth convention: credential accounts use the user's own id as accountId, not the email.
              providerId: 'credential',
              issuer: 'local:credential', // Better-Auth >=1.7 requires this synthetic issuer to match a credential account during sign-in.
              password: passwordHash,
              createdAt: now,
              updatedAt: now,
            })
            return { data: { user: { id: userId, email: opts.email } }, error: null }
          } catch (err: any) {
            return { data: { user: null }, error: { message: err?.message ?? String(err) } }
          }
        },
        async deleteUser(userId: string) {
          try {
            await db.delete(schema.users).where(eq(schema.users.id, userId))
            return { data: null, error: null }
          } catch (err: any) {
            return { data: null, error: { message: err?.message ?? String(err) } }
          }
        },
      },
    },
  }
}
