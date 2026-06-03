import { redirect } from 'next/navigation'
import Image from 'next/image'
import { requireTenant } from '@/lib/supabase/tenant'
import { PortalNav } from './portal/portal-nav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { role } = await requireTenant()
  // Portál je jen pro externí uživatele (klienti/promotéři); admin smí náhled.
  if (role !== 'external' && role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm lg:px-8">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Globaal Elevate" width={120} height={36} className="logo-smart object-contain" priority />
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Klientský portál</span>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Odhlásit</button>
        </form>
      </header>
      <PortalNav />
      <main className="mx-auto max-w-4xl p-4 lg:p-8">{children}</main>
    </div>
  )
}
