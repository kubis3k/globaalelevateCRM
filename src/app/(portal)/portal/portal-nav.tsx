'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { href: '/portal', label: 'Přehled' },
  { href: '/portal/invoices', label: 'Faktury' },
  { href: '/portal/documents', label: 'Dokumenty' },
]

export function PortalNav() {
  const pathname = usePathname()
  return (
    <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pt-3 lg:px-8">
      {SECTIONS.map((s) => {
        const active = s.href === '/portal' ? pathname === '/portal' : pathname.startsWith(s.href)
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        )
      })}
    </nav>
  )
}
