'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, DollarSign, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItemProps = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

const items: NavItemProps[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/team', icon: Users, label: 'Tým' },
  { href: '/invoices', icon: FileText, label: 'Faktury' },
  { href: '/finance', icon: DollarSign, label: 'Finance' },
  { href: '/calendar', icon: Calendar, label: 'Kalendář' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-3 mb-3">
        Menu
      </p>
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 group",
              isActive 
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-sm shadow-indigo-100/10 dark:shadow-none" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/4 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            {/* Active vertical bar indicator */}
            {isActive && (
              <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
            )}
            
            <Icon 
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110",
                isActive 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
              )} 
            />
            <span className={cn(
              "transition-transform duration-300 group-hover:translate-x-0.5",
              isActive ? "font-semibold" : ""
            )}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
