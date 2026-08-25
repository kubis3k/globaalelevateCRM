// Jemná oprávnění pro citlivé mutace (nezávislé na přístupu k modulům, které
// řeší custom role). Model záměrně jednoduchý: admin vše, manager provozní
// domény, ostatní nic z citlivých akcí. Rozšiřuj přidáním do Permission.
export type Permission =
  | 'finance.manage'      // transakce, kategorie, import výpisů
  | 'contracts.manage'    // obchodní smlouvy
  | 'hr.manage'           // personalistika, mzdy
  | 'documents.deleteAny' // mazání cizích dokumentů
  | 'team.manage'         // členové organizace, role
  | 'portal.manage'       // klientský portál, pozvánky
  | 'settings.manage'     // firemní nastavení
  | 'leads.manage'        // import leadů, bulk přiřazení, blocklist, ČTÚ export
  | 'leads.viewAll'       // vidět leady všech obchodníků (jinak jen vlastní)

// admin-only akce: správa lidí, portálu, nastavení. Provozní domény smí i manager.
const MANAGER_DENIED: ReadonlySet<Permission> = new Set(['team.manage', 'portal.manage', 'settings.manage'])

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (role === 'admin') return true
  if (role === 'manager') return !MANAGER_DENIED.has(permission)
  return false
}
