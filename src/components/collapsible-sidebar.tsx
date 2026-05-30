'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, DollarSign, Calendar, LogOut, ChevronRight } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { MODULES } from '@/lib/modules'

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  team: Users,
  invoices: FileText,
  finance: DollarSign,
  calendar: Calendar,
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrátor',
  manager: 'Manažer',
  employee: 'Zaměstnanec',
  external: 'Externista',
}

type Props = {
  username: string
  initials: string
  role?: string | null
  allowedModules: string[]
}

export function CollapsibleSidebar({ username, initials, role, allowedModules }: Props) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const navItems = MODULES
    .filter((m) => allowedModules.includes(m.id))
    .map((m) => ({ href: m.href, label: m.label, Icon: MODULE_ICONS[m.id] }))
  const roleLabel = (role && ROLE_LABELS[role]) || 'Uživatel'

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        'group relative flex flex-col shrink-0 h-screen sticky top-0 z-30',
        'bg-white dark:bg-[#0d1117]',
        'border-r border-slate-200 dark:border-white/5',
        'transition-all duration-300 ease-in-out overflow-hidden',
        expanded ? 'w-60' : 'w-[60px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-300',
        expanded ? 'px-4 py-5 justify-center' : 'px-0 py-5 justify-center'
      )}>
        {expanded ? (
          <Image
            src="/logo.png"
            alt="Globaal Elevate"
            width={140}
            height={44}
            className="logo-smart object-contain"
            priority
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="text-white text-xs font-black tracking-tighter">GE</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-4 overflow-hidden">
        {!expanded && (
          <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest text-center mb-2 select-none">•••</p>
        )}
        {expanded && (
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-2 mb-2 whitespace-nowrap select-none">Menu</p>
        )}

        {navItems.map(({ href, Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={!expanded ? label : undefined}
              className={cn(
                'relative flex items-center rounded-xl transition-all duration-200 group/item overflow-hidden',
                expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5 mx-auto w-10 h-10',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              {isActive && expanded && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
              )}
              <Icon className={cn(
                'h-4 w-4 shrink-0 transition-all duration-200',
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover/item:text-indigo-500 dark:group-hover/item:text-indigo-400',
                !expanded && isActive && 'drop-shadow-[0_0_4px_rgba(99,102,241,0.6)]'
              )} />
              {expanded && (
                <span className={cn(
                  'text-sm whitespace-nowrap transition-opacity duration-150',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        'border-t border-slate-100 dark:border-white/5 px-2 py-3 overflow-hidden transition-all duration-300'
      )}>
        {expanded ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate">{username}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-600">{roleLabel}</div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-slate-400 hover:text-red-600 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-1" title="Odhlásit se">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-default"
              title={username}
            >
              {initials}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
