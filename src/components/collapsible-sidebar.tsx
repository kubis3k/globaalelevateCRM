'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, DollarSign, Calendar, Briefcase } from 'lucide-react'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  team: Users,
  invoices: FileText,
  finance: DollarSign,
  calendar: Calendar,
  hr: Briefcase,
}

export function CollapsibleSidebar({ allowedModules }: { allowedModules: string[] }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const items = MODULES.filter((m) => allowedModules.includes(m.id))

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
        {expanded ? (
          <Image
            src="/logo.png"
            alt="Globaal Elevate"
            width={132}
            height={40}
            className="logo-smart object-contain"
            priority
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black tracking-tighter text-primary-foreground">
            GE
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-hidden p-2">
        {expanded && (
          <p className="px-3 pt-1 pb-2 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase select-none">
            Menu
          </p>
        )}
        {items.map(({ id, href, label }) => {
          const Icon = MODULE_ICONS[id]
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={!expanded ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-9 items-center rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                expanded ? 'gap-3 px-3' : 'justify-center',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
              )}
              {Icon && <Icon className="size-4 shrink-0" />}
              {expanded && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
