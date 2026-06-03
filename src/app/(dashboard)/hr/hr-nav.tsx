'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { href: '/hr', label: 'Přehled' },
  { href: '/hr/employees', label: 'Zaměstnanci' },
  { href: '/hr/contracts', label: 'Smlouvy' },
  { href: '/hr/leave', label: 'Dovolená' },
  { href: '/hr/attendance', label: 'Docházka' },
  { href: '/hr/onboarding', label: 'Onboarding' },
  { href: '/hr/documents', label: 'Dokumenty' },
  { href: '/hr/recruitment', label: 'Nábor' },
]

export function HrNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {SECTIONS.map((s) => {
        const active = s.href === '/hr' ? pathname === '/hr' : pathname.startsWith(s.href)
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
