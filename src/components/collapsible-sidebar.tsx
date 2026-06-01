'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Receipt, Wallet, CalendarDays, Briefcase, Building2, Mail,
  FolderOpen, Sparkles, User, Target, FolderKanban, Clock, ScrollText, BarChart3,
  Settings, Coins, ChevronRight, TrendingUp, Layers,
} from 'lucide-react'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'

export const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  personal: User,
  dashboard: LayoutDashboard,
  milestones: Target,
  'globaal-ai': Sparkles,
  mail: Mail,
  calendar: CalendarDays,
  finance: Wallet,
  invoices: Receipt,
  documents: FolderOpen,
  hr: Briefcase,
  team: Users,
  crm: Building2,
  projects: FolderKanban,
  time: Clock,
  quotes: ScrollText,
  reports: BarChart3,
  expenses: Coins,
  settings: Settings,
}

// Logické rozdělení do skupin (šetří místo). Standalone moduly nahoře/dole,
// příbuzné moduly schované do rozbalovacích skupin.
type GroupIcon = React.ComponentType<{ className?: string }>
export type NavEntry =
  | { type: 'module'; id: string; pinBottom?: boolean }
  | { type: 'group'; id: string; label: string; icon: GroupIcon; members: string[] }

export const NAV: NavEntry[] = [
  { type: 'module', id: 'personal' },
  { type: 'module', id: 'dashboard' },
  { type: 'module', id: 'milestones' },
  { type: 'module', id: 'globaal-ai' },
  { type: 'group', id: 'g-finance', label: 'Finance', icon: Wallet, members: ['finance', 'invoices', 'expenses', 'quotes', 'reports'] },
  { type: 'group', id: 'g-sales', label: 'Obchod', icon: TrendingUp, members: ['crm', 'projects', 'time'] },
  { type: 'group', id: 'g-hr', label: 'HR', icon: Briefcase, members: ['hr', 'team'] },
  { type: 'group', id: 'g-office', label: 'Kancelář', icon: Layers, members: ['mail', 'calendar', 'documents'] },
  { type: 'module', id: 'settings', pinBottom: true },
]

const idleCls = 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
const activeCls = 'bg-sidebar-accent text-sidebar-accent-foreground'
const moduleHrefOf = (id: string) => MODULES.find((m) => m.id === id)?.href || '/dashboard'
const moduleLabelOf = (id: string) => MODULES.find((m) => m.id === id)?.label || id

export function CollapsibleSidebar({ allowedModules }: { allowedModules: string[] }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const allowed = new Set(allowedModules)

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Sestavíme viditelné položky (skupiny bez dostupných členů vypadnou).
  const entries = NAV
    .map((e) => {
      if (e.type === 'module') return allowed.has(e.id) ? e : null
      const members = e.members.filter((m) => allowed.has(m))
      return members.length ? { ...e, members } : null
    })
    .filter(Boolean) as NavEntry[]

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        'group sticky top-0 z-30 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out lg:flex',
        expanded ? 'w-60' : 'w-[60px]'
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border px-3">
        <Image src="/logo.png" alt="Globaal Elevate" width={expanded ? 132 : 32} height={expanded ? 40 : 32} className={cn('logo-smart object-contain', !expanded && 'size-8')} priority />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-2">
        {expanded && <p className="px-3 pt-1 pb-2 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase select-none">Menu</p>}

        {entries.map((e) => {
          if (e.type === 'module') {
            const Icon = MODULE_ICONS[e.id]
            const href = moduleHrefOf(e.id)
            const isActive = active(href)
            return (
              <Link
                key={e.id}
                href={href}
                title={!expanded ? moduleLabelOf(e.id) : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-9 items-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  expanded ? 'gap-3 px-3' : 'justify-center',
                  e.pinBottom && 'mt-auto',
                  isActive ? activeCls : idleCls
                )}
              >
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />}
                {Icon && <Icon className="size-4 shrink-0" />}
                {expanded && <span className="truncate">{moduleLabelOf(e.id)}</span>}
              </Link>
            )
          }

          // group
          const GroupIco = e.icon
          const groupActive = e.members.some((m) => active(moduleHrefOf(m)))
          const isOpen = open[e.id] ?? groupActive

          if (!expanded) {
            // Sbaleno → ikona skupiny vede na první modul.
            return (
              <Link
                key={e.id}
                href={moduleHrefOf(e.members[0])}
                title={e.label}
                className={cn('relative flex h-9 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring', groupActive ? activeCls : idleCls)}
              >
                {groupActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />}
                <GroupIco className="size-4 shrink-0" />
              </Link>
            )
          }

          return (
            <div key={e.id}>
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [e.id]: !(o[e.id] ?? groupActive) }))}
                aria-expanded={isOpen}
                className={cn('flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring', groupActive ? 'text-sidebar-foreground' : idleCls)}
              >
                <GroupIco className="size-4 shrink-0" />
                <span className="flex-1 truncate text-left">{e.label}</span>
                <ChevronRight className={cn('size-3.5 shrink-0 text-sidebar-foreground/50 transition-transform', isOpen && 'rotate-90')} />
              </button>

              {isOpen && (
                <div className="mt-0.5 mb-1 ml-[1.65rem] flex flex-col gap-0.5 border-l border-sidebar-border/70 pl-2">
                  {e.members.map((m) => {
                    const Icon = MODULE_ICONS[m]
                    const href = moduleHrefOf(m)
                    const isActive = active(href)
                    return (
                      <Link
                        key={m}
                        href={href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn('flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring', isActive ? 'font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/55 hover:text-sidebar-foreground')}
                      >
                        {Icon && <Icon className="size-3.5 shrink-0" />}
                        <span className="truncate">{moduleLabelOf(m)}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
