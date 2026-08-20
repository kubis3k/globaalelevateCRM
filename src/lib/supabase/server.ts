import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth/auth'
import { from } from '@/lib/db/pg-shim'

// Nahrazuje Supabase (Postgres přes RLS + Auth) — `.from()` jde přes
// PostgREST-kompatibilní shim (src/lib/db/pg-shim.ts) na Neon/Drizzle,
// `.auth` přes Better-Auth. Žádná reálná Supabase závislost tu už není
// (storage pro tento klient nikdy nebylo potřeba — všechny `.storage.`
// call-sites v appce jdou přes createAdminClient(), viz admin.ts).
export async function createClient() {
  const h = await headers()

  return {
    from,
    auth: {
      async getUser() {
        const session = await auth.api.getSession({ headers: h })
        if (!session?.user) return { data: { user: null }, error: null }
        return { data: { user: { id: session.user.id, email: session.user.email as string } }, error: null }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
          await auth.api.signInEmail({ body: { email, password }, headers: h })
          return { error: null }
        } catch (err: any) {
          return { error: { message: err?.message || 'Neplatné přihlašovací údaje.' } }
        }
      },
      async signOut() {
        await auth.api.signOut({ headers: h })
        return { error: null }
      },
    },
  }
}
