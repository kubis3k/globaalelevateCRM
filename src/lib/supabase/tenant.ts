import { redirect } from 'next/navigation'
import { createClient } from './server'
import { createAdminClient } from './admin'
import { getAllowedModules } from '@/lib/permissions'
import { moduleHref, type ModuleId } from '@/lib/modules'

export async function requireTenant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  // Získání tenant_id, role a custom role přes admin client (obchází RLS rekurzi).
  // custom_role_id nemusí existovat, dokud neproběhne migrace – proto defenzivní fallback.
  let tenantId: string | null = null
  let role: string | null = null
  let customRoleId: string | null = null

  const { data: cu, error } = await adminClient
    .from('tenant_users')
    .select('tenant_id, role, custom_role_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.warn('requireTenant: extended select failed, falling back', error.message)
    const { data: base } = await adminClient
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (base) {
      tenantId = base.tenant_id
      role = base.role
    }
  } else if (cu) {
    tenantId = cu.tenant_id
    role = cu.role
    customRoleId = (cu as { custom_role_id?: string | null }).custom_role_id ?? null
  }

  // Moduly přiřazené přes custom roli (pokud nějaká je).
  let customRoleModules: string[] | null = null
  if (customRoleId) {
    const { data: cr } = await adminClient
      .from('custom_roles')
      .select('modules')
      .eq('id', customRoleId)
      .maybeSingle()
    customRoleModules = (cr?.modules as string[] | undefined) ?? null
  }

  const allowedModules = getAllowedModules({ role, customRoleModules })

  return {
    supabase: adminClient,
    user,
    tenantId,
    role,
    customRoleId,
    allowedModules,
  }
}

// Stránkový guard: vyžaduje přístup k modulu. Pokud uživatel modul nemá povolený,
// přesměruje na první povolený modul (nebo na /no-access, pokud nemá žádný).
export async function requireModuleAccess(moduleId: ModuleId) {
  const ctx = await requireTenant()

  // Bez přiřazeného tenanta řeší zobrazení sám volající (NoTenantView).
  if (ctx.tenantId && !ctx.allowedModules.includes(moduleId)) {
    const target = ctx.allowedModules[0] ? moduleHref(ctx.allowedModules[0]) : '/no-access'
    redirect(target)
  }

  return ctx
}
