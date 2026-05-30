import { ALL_MODULE_IDS, type ModuleId } from './modules'

// Module access model (confirmed with product):
//   - admin (system role) → all modules
//   - assigned a custom role → exactly that role's modules
//   - no custom role → all modules (backwards-compatible default)
export function getAllowedModules({
  role,
  customRoleModules,
}: {
  role: string | null | undefined
  customRoleModules: string[] | null | undefined
}): ModuleId[] {
  if (role === 'admin') return [...ALL_MODULE_IDS]
  if (!customRoleModules || customRoleModules.length === 0) return [...ALL_MODULE_IDS]
  // Keep only known module ids and preserve canonical order so nav/order stays stable.
  return ALL_MODULE_IDS.filter((id) => customRoleModules.includes(id))
}

export function canAccessModule(allowed: readonly string[], moduleId: string): boolean {
  return allowed.includes(moduleId)
}
