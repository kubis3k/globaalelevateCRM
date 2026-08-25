import 'server-only'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { can } from '@/lib/auth/permissions'

// Jednotný guard pro celý modul Leady (Obchod → Akvizice). Řeší tři věci, které
// dnešní `getCtx()` v prospects/crm actions NEřeší a scout je označil za díru:
//   1) role: `external` (klientský portál) NESMÍ na leady vůbec,
//   2) host: leady jsou interní data — nedostupné z klient./jobs. domény
//      (obrana do hloubky; portálový účet je navíc už `external`),
//   3) scope: obchodník (employee) vidí jen své leady, manager/admin všechny.
//
// ZÁMĚRNĚ neredirectuje (na rozdíl od requireTenant) — vrací chybový objekt,
// aby stejná funkce šla použít v server action (return {error}) i v API route
// (new Response(..., {status})).

export type LeadsScope = 'all' | 'own'
export type LeadsCtx = {
  admin: ReturnType<typeof createAdminClient>
  userId: string
  tenantId: string
  role: string
  scope: LeadsScope
}
export type LeadsDenied = { error: string; status: 401 | 403 }

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase()
  // Leady jsou interní: blokujeme klientský portál i náborový web. Work doména,
  // *.vercel.app preview i localhost projdou (černá listina, ne bílá — aby se
  // nerozbila preview nasazení ani strojová volání).
  return h.startsWith('klient.') || h.startsWith('jobs.')
}

export async function resolveLeadsCtx(): Promise<LeadsCtx | LeadsDenied> {
  const hdrs = await headers()
  const host = hdrs.get('host') || ''
  if (isBlockedHost(host)) {
    return { error: 'Leady nejsou z této domény dostupné.', status: 403 }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.', status: 401 }

  const admin = createAdminClient()
  const { data: tu } = await admin
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.', status: 403 }

  const role = tu.role as string
  if (role === 'external') {
    return { error: 'Nemáte oprávnění k modulu Obchod.', status: 403 }
  }

  const scope: LeadsScope = can(role, 'leads.viewAll') ? 'all' : 'own'
  return { admin, userId: user.id, tenantId: tu.tenant_id, role, scope }
}

// Smí tento uživatel číst/měnit lead s daným vlastníkem?
// scope 'all' → vždy; scope 'own' → jen vlastní nebo dosud nepřiřazený
// (nepřiřazený musí být vidět, aby si ho obchodník mohl převzít; volat ho ale
// nejde, dokud si ho nepřiřadí — to řeší UI/fronta).
export function canTouchLead(ctx: LeadsCtx, ownerId: string | null | undefined): boolean {
  if (ctx.scope === 'all') return true
  return ownerId == null || ownerId === ctx.userId
}
