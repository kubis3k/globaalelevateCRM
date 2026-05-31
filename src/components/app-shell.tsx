'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, DollarSign, Calendar, Briefcase, Building2, Menu, X, LogOut,
} from 'lucide-react'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'
import { CollapsibleSidebar } from './collapsible-sidebar'
import { ThemeToggle } from './ui/theme-toggle'
import { Avatar } from './ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from './ui/dropdown-menu'

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  team: Users,
  invoices: FileText,
  finance: DollarSign,
  calendar: Calendar,
  hr: Briefcase,
  crm: Building2,
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrátor',
  manager: 'Manažer',
  employee: 'Zaměstnanec',
  external: 'Externista',
}

export function AppShell({
  username,
  role,
  allowedModules,
  children,
}: {
  username: string
  role?: string | null
  allowedModules: string[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const logoutForm = useRef<HTMLFormElement>(null)

  const items = MODULES.filter((m) => allowedModules.includes(m.id))
  const current = MODULES.find(
    (m) => pathname === m.href || (m.href !== '/dashboard' && pathname.startsWith(m.href))
  )
  const roleLabel = (role && ROLE_LABELS[role]) || 'Uživatel'

  return (
    <div className="flex min-h-dvh bg-background">
      <CollapsibleSidebar allowedModules={allowedModules} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar p-2 animate-in slide-in-from-left duration-200">
            <div className="flex h-12 items-center justify-between pl-2">
              <Image src="/logo.png" alt="Globaal Elevate" width={120} height={36} className="logo-smart object-contain" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Zavřít menu"
                className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="mt-2 flex flex-col gap-0.5">
              {items.map(({ id, href, label }) => {
                const Icon = MODULE_ICONS[id]
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    {Icon && <Icon className="size-4 shrink-0" />}
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Otevřít menu"
            className="-ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <h1 className="text-sm font-semibold text-foreground">
            {current?.label ?? 'Globaal Elevate'}
          </h1>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:pr-2">
                <Avatar name={username} />
                <div className="hidden text-left leading-tight sm:block">
                  <div className="text-xs font-medium text-foreground">{username}</div>
                  <div className="text-[10px] text-muted-foreground">{roleLabel}</div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium text-foreground">{username}</div>
                  <div className="text-xs font-normal text-muted-foreground">{roleLabel}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => logoutForm.current?.requestSubmit()}>
                  <LogOut />
                  Odhlásit se
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <form ref={logoutForm} action="/auth/signout" method="post" className="hidden" />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
