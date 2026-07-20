'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'
import { MODULE_ICONS, NAV, type NavEntry } from './collapsible-sidebar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from './ui/dropdown-menu'

const moduleHrefOf = (id: string) => MODULES.find((m) => m.id === id)?.href || '/dashboard'
const moduleLabelOf = (id: string) => MODULES.find((m) => m.id === id)?.label || id

const idleCls = 'text-muted-foreground hover:bg-muted hover:text-foreground'
const activeCls = 'bg-muted text-foreground'

// Horizontální navigace pro desktop (lg+). Skupiny modulů jako dropdowny,
// samostatné moduly jako přímé odkazy. Mobil řeší drawer v AppShell.
export function TopNav({ allowedModules }: { allowedModules: string[] }) {
  const pathname = usePathname()
  const allowed = new Set(allowedModules)
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const entries = NAV
    .map((e) => {
      if (e.type === 'module') return allowed.has(e.id) ? e : null
      const members = e.members.filter((m) => allowed.has(m))
      return members.length ? { ...e, members } : null
    })
    .filter(Boolean) as NavEntry[]

  return (
    <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex" aria-label="Hlavní navigace">
      {entries.map((e) => {
        if (e.type === 'module') {
          const Icon = MODULE_ICONS[e.id]
          const href = moduleHrefOf(e.id)
          const isActive = active(href)
          return (
            <Link
              key={e.id}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? activeCls : idleCls,
              )}
            >
              {Icon && <Icon className="size-4 shrink-0" />}
              <span className="hidden xl:inline">{moduleLabelOf(e.id)}</span>
            </Link>
          )
        }

        const GroupIco = e.icon
        const groupActive = e.members.some((m) => active(moduleHrefOf(m)))
        return (
          <DropdownMenu key={e.id}>
            <DropdownMenuTrigger
              className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                groupActive ? activeCls : idleCls,
              )}
            >
              <GroupIco className="size-4 shrink-0" />
              <span className="hidden xl:inline">{e.label}</span>
              <ChevronDown className="size-3 shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {e.members.map((m) => {
                const Icon = MODULE_ICONS[m]
                const href = moduleHrefOf(m)
                const isActive = active(href)
                return (
                  <DropdownMenuItem
                    key={m}
                    render={<Link href={href} aria-current={isActive ? 'page' : undefined} />}
                    className={cn('cursor-pointer', isActive && 'bg-muted font-medium')}
                  >
                    {Icon && <Icon className="size-4" />}
                    {moduleLabelOf(m)}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </nav>
  )
}
