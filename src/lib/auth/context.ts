import 'server-only'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { can, type Permission } from './permissions'

// Jednotný autorizační context pro Server Actions. Nahrazuje duplikované
// lokální getCtx() v jednotlivých actions.ts. Vždy ověří přihlášeného
// uživatele + tenant; requirePermission navíc konkrétní oprávnění.
//
// Service-role (admin) klient se vrací až PO ověření uživatele a tenantu —
// mutace tak běží pod ověřeným kontextem, i když technicky obchází RLS
// (viz docs/adr/0002, sekce bezpečné výjimky).

export type AuthContext = {
  admin: ReturnType<typeof createAdminClient>
  userId: string
  tenantId: string
  role: string
}
export type AuthResult = AuthContext | { error: string }

export function isAuthError(r: AuthResult): r is { error: string } {
  return 'error' in r
}

export async function getAuthContext(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role || 'employee' }
}

// Vyžaduje kontext + konkrétní oprávnění. Vrací { error } při chybějícím
// přihlášení, tenantu nebo oprávnění — vhodné přímo pro Server Action výstup.
export async function requirePermission(permission: Permission): Promise<AuthResult> {
  const ctx = await getAuthContext()
  if (isAuthError(ctx)) return ctx
  if (!can(ctx.role, permission)) return { error: 'Nemáte oprávnění k této akci.' }
  return ctx
}

// Dočasné heslo po Neon cutoveru (viz api/admin/seed-passwords) — layouty
// (dashboard i portal) na true přesměrují na /force-password-change.
export async function mustChangePassword(userId: string): Promise<boolean> {
  const [row] = await db.select({ v: schema.users.mustChangePassword }).from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  return row?.v ?? false
}
