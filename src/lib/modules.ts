// Single source of truth for the app's modules.
// Consumed by the sidebar nav, the team role-management UI, and module access control.
export const MODULES = [
  { id: 'personal',  label: 'Osobní',    href: '/personal',  color: '#ec4899' },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', color: '#6366f1' },
  { id: 'milestones', label: 'Cíle',     href: '/milestones', color: '#84cc16' },
  { id: 'globaal-ai', label: 'Globaal AI', href: '/ai',       color: '#a855f7' },
  { id: 'mail',      label: 'Pošta',     href: '/mail',      color: '#f97316' },
  { id: 'calendar',  label: 'Kalendář',  href: '/calendar',  color: '#f59e0b' },
  { id: 'finance',   label: 'Finance',   href: '/finance',   color: '#10b981' },
  { id: 'invoices',  label: 'Faktury',   href: '/invoices',  color: '#0ea5e9' },
  { id: 'documents', label: 'Dokumenty', href: '/documents', color: '#14b8a6' },
  { id: 'logo3d',    label: '3D Studio', href: '/logo3d',    color: '#c026d3' },
  { id: 'animations', label: 'Animace',  href: '/animations', color: '#e11d48' },
  { id: 'visualizer', label: 'Vizualizátor', href: '/visualizer', color: '#22d3ee' },
  { id: 'social',    label: 'Sociální sítě', href: '/social',    color: '#2563eb' },
  { id: 'hr',        label: 'HR',        href: '/hr',        color: '#f43f5e' },
  { id: 'team',      label: 'Tým',       href: '/team',      color: '#8b5cf6' },
  { id: 'crm',       label: 'CRM',       href: '/crm',       color: '#06b6d4' },
  { id: 'projects',  label: 'Projekty',  href: '/projects',  color: '#7c3aed' },
  { id: 'time',      label: 'Výkazy',    href: '/time',      color: '#eab308' },
  { id: 'quotes',    label: 'Nabídky',   href: '/quotes',    color: '#d946ef' },
  { id: 'reports',   label: 'Reporty',   href: '/reports',   color: '#64748b' },
  { id: 'expenses',  label: 'Výdaje',    href: '/expenses',  color: '#dc2626' },
  { id: 'settings',  label: 'Nastavení', href: '/settings',  color: '#6b7280' },
] as const

export type ModuleId = (typeof MODULES)[number]['id']

export const ALL_MODULE_IDS: ModuleId[] = MODULES.map((m) => m.id)

export function moduleHref(id: string): string {
  return MODULES.find((m) => m.id === id)?.href ?? '/dashboard'
}
