'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Receipt, Wallet, CalendarDays, Briefcase, Building2, Mail,
  FolderOpen, Sparkles, User, Target, FolderKanban, Clock, ScrollText, BarChart3,
  Settings, Coins, ChevronRight,
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

// Vnitřní volby (pod-stránky) modulů — rozbalí se v sidebaru.
const SUB_ITEMS: Record<string, { href: string; label: string }[]> = {
  personal: [
    { href: '/personal', label: 'Přehled' },
    { href: '/personal/notes', label: 'Poznámky' },
    { href: '/personal/tasks', label: 'Úkoly' },
    { href: '/personal/goals', label: 'Cíle' },
    { href: '/personal/calendar', label: 'Kalendář' },
  ],
  hr: [
    { href: '/hr', label: 'Přehled' },
    { href: '/hr/employees', label: 'Zaměstnanci' },
    { href: '/hr/leave', label: 'Dovolená' },
    { href: '/hr/attendance', label: 'Docházka' },
    { href: '/hr/documents', label: 'Dokumenty' },
    { href: '/hr/recruitment', label: 'Nábor' },
  ],
  crm: [
    { href: '/crm', label: 'Přehled' },
    { href: '/crm/clients', label: 'Klienti' },
    { href: '/crm/pipeline', label: 'Příležitosti' },
  ],
  projects: [
    { href: '/projects', label: 'Přehled' },
    { href: '/projects/board', label: 'Nástěnka' },
  ],
  time: [
    { href: '/time', label: 'Přehled' },
    { href: '/time/entries', label: 'Záznamy' },
  ],
  quotes: [
    { href: '/quotes', label: 'Nabídky' },
    { href: '/quotes/catalog', label: 'Katalog' },
  ],
}

export function CollapsibleSidebar({ allowedModules }: { allowedModules: string[] }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const items = MODULES.filter((m) => allowedModules.includes(m.id))

  const moduleActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const idleCls = 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
  const activeCls = 'bg-sidebar-accent text-sidebar-accent-foreground'

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        'group sticky top-0 z-30 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out lg:flex',
        expanded ? 'w-60' : 'w-[60px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border px-3">
        <Image
          src="/logo.png"
          alt="Globaal Elevate"
          width={expanded ? 132 : 32}
          height={expanded ? 40 : 32}
          className={cn('logo-smart object-contain', !expanded && 'size-8')}
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto p-2">
        {expanded && (
          <p className="px-3 pt-1 pb-2 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase select-none">
            Menu
          </p>
        )}

        {items.map(({ id, href, label }) => {
          const Icon = MODULE_ICONS[id]
          const children = SUB_ITEMS[id]
          const active = moduleActive(href)
          const isOpen = open[id] ?? active
          const pinBottom = id === 'settings'

          // Sbalený sidebar → jen ikony.
          if (!expanded) {
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-9 items-center justify-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  pinBottom && 'mt-auto',
                  active ? activeCls : idleCls
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />}
                {Icon && <Icon className="size-4 shrink-0" />}
              </Link>
            )
          }

          // Rozbalený sidebar → modul + (volitelně) vnitřní volby.
          return (
            <div key={href} className={cn(pinBottom && 'mt-auto')}>
              <div className={cn('relative flex items-center rounded-lg', active ? activeCls : idleCls)}>
                {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />}
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className="flex h-9 flex-1 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  {Icon && <Icon className="size-4 shrink-0" />}
                  <span className="truncate">{label}</span>
                </Link>
                {children && (
                  <button
                    type="button"
                    aria-label={isOpen ? 'Sbalit' : 'Rozbalit'}
                    onClick={() => setOpen((o) => ({ ...o, [id]: !(o[id] ?? active) }))}
                    className="flex h-9 items-center px-2 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                  >
                    <ChevronRight className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')} />
                  </button>
                )}
              </div>

              {children && isOpen && (
                <div className="mt-0.5 mb-1 ml-[1.65rem] flex flex-col gap-0.5 border-l border-sidebar-border/70 pl-2">
                  {children.map((s) => {
                    const isRoot = s.href === href
                    const subActive = isRoot ? pathname === s.href : (pathname === s.href || pathname.startsWith(s.href + '/'))
                    return (
                      <Link
                        key={s.href}
                        href={s.href}
                        aria-current={subActive ? 'page' : undefined}
                        className={cn(
                          'rounded-md px-2 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                          subActive ? 'font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/55 hover:text-sidebar-foreground'
                        )}
                      >
                        {s.label}
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
