// Single source of truth for the app's modules.
// Consumed by the sidebar nav, the team role-management UI, and module access control.
export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', color: '#6366f1' },
  { id: 'team',      label: 'Tým',       href: '/team',      color: '#8b5cf6' },
  { id: 'invoices',  label: 'Faktury',   href: '/invoices',  color: '#0ea5e9' },
  { id: 'finance',   label: 'Finance',   href: '/finance',   color: '#10b981' },
  { id: 'calendar',  label: 'Kalendář',  href: '/calendar',  color: '#f59e0b' },
  { id: 'hr',        label: 'HR',        href: '/hr',        color: '#f43f5e' },
  { id: 'crm',       label: 'CRM',       href: '/crm',       color: '#06b6d4' },
  { id: 'mail',      label: 'Pošta',     href: '/mail',      color: '#f97316' },
] as const

export type ModuleId = (typeof MODULES)[number]['id']

export const ALL_MODULE_IDS: ModuleId[] = MODULES.map((m) => m.id)

export function moduleHref(id: string): string {
  return MODULES.find((m) => m.id === id)?.href ?? '/dashboard'
}
