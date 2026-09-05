'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, FileText, FolderOpen, MessageSquare, FileSignature, PackageCheck, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { href: '/portal', label: 'Přehled', icon: LayoutGrid },
  { href: '/portal/invoices', label: 'Faktury', icon: FileText },
  { href: '/portal/contracts', label: 'Smlouvy', icon: FileSignature },
  { href: '/portal/deliverables', label: 'Dodávky', icon: PackageCheck },
  { href: '/portal/reports', label: 'Reporty', icon: BarChart3 },
  { href: '/portal/documents', label: 'Dokumenty', icon: FolderOpen },
  { href: '/portal/messages', label: 'Komunikace', icon: MessageSquare },
]

export function PortalNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-3">
      {SECTIONS.map((s) => {
        const active = s.href === '/portal' ? pathname === '/portal' : pathname.startsWith(s.href)
        const Icon = s.icon
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}
