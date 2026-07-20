'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, Bell, ChevronRight, KeyRound } from 'lucide-react'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'
import { MODULE_ICONS, NAV } from './collapsible-sidebar'
import { TopNav } from './top-nav'
import { PushSetupDialog } from './pwa/push-setup-dialog'
import { ChangePasswordDialog } from './change-password-dialog'
import { ThemeToggle } from './ui/theme-toggle'
import { Avatar } from './ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from './ui/dropdown-menu'

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
  const [showPush, setShowPush] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const logoutForm = useRef<HTMLFormElement>(null)

  const mActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const current = MODULES.find(
    (m) => pathname === m.href || (m.href !== '/dashboard' && pathname.startsWith(m.href))
  )
  const roleLabel = (role && ROLE_LABELS[role]) || 'Uživatel'

  return (
    <div className="flex min-h-dvh bg-background">
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
            <nav className="mt-2 flex flex-1 flex-col gap-0.5 overflow-y-auto">
              {NAV.map((e) => {
                if (e.type === 'module') {
                  if (!allowedModules.includes(e.id)) return null
                  const m = MODULES.find((x) => x.id === e.id)
                  if (!m) return null
                  const Icon = MODULE_ICONS[e.id]
                  const active = mActive(m.href)
                  return (
                    <Link key={e.id} href={m.href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined}
                      className={cn('flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors', e.pinBottom && 'mt-auto',
                        active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                      {Icon && <Icon className="size-4 shrink-0" />}{m.label}
                    </Link>
                  )
                }
                const members = e.members.filter((id) => allowedModules.includes(id))
                if (!members.length) return null
                const GroupIco = e.icon
                const groupActive = members.some((id) => mActive(MODULES.find((x) => x.id === id)?.href || ''))
                const isOpen = openGroups[e.id] ?? groupActive
                return (
                  <div key={e.id}>
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenGroups((o) => ({ ...o, [e.id]: !(o[e.id] ?? groupActive) }))}
                      className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                      <GroupIco className="size-4 shrink-0" />
                      <span className="flex-1 truncate text-left">{e.label}</span>
                      <ChevronRight className={cn('size-3.5 text-sidebar-foreground/50 transition-transform', isOpen && 'rotate-90')} />
                    </button>
                    {isOpen && (
                      <div className="mt-0.5 mb-1 ml-[1.65rem] flex flex-col gap-0.5 border-l border-sidebar-border/70 pl-2">
                        {members.map((id) => {
                          const m = MODULES.find((x) => x.id === id)
                          if (!m) return null
                          const Icon = MODULE_ICONS[id]
                          const active = mActive(m.href)
                          return (
                            <Link key={id} href={m.href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined}
                              className={cn('flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors', active ? 'font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/55 hover:text-sidebar-foreground')}>
                              {Icon && <Icon className="size-3.5 shrink-0" />}<span className="truncate">{m.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
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

          <Link href="/dashboard" className="hidden shrink-0 lg:block">
            <Image src="/logo.png" alt="Globaal Elevate" width={110} height={32} className="logo-smart h-8 w-auto object-contain" priority />
          </Link>

          <h1 className="text-sm font-semibold text-foreground lg:hidden">
            {current?.label ?? 'Globaal Elevate'}
          </h1>

          <TopNav allowedModules={allowedModules} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
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
                <DropdownMenuItem onClick={() => setShowPush(true)}>
                  <Bell />
                  Notifikace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPassword(true)}>
                  <KeyRound />
                  Změnit heslo
                </DropdownMenuItem>
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

      <PushSetupDialog open={showPush} onClose={() => setShowPush(false)} />
      <ChangePasswordDialog open={showPassword} onClose={() => setShowPassword(false)} />
    </div>
  )
}
