import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getPortalScope } from './portal/scope'
import { PortalNav } from './portal/portal-nav'
import { PortalHeaderActions } from './portal/portal-header-actions'
import { mustChangePassword } from '@/lib/auth/context'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { role, access, user } = await getPortalScope()
  if (await mustChangePassword(user.id)) redirect('/force-password-change')
  // Portál je jen pro externí uživatele (klienti/promotéři); admin smí náhled.
  if (role !== 'external' && role !== 'admin') redirect('/dashboard')
  const name = access?.display_name || 'Klient'

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Globaal Elevate" width={171} height={32} className="logo-smart h-8 w-auto object-contain" priority />
            <div className="hidden border-l border-border pl-3 sm:block">
              <div className="text-sm font-semibold leading-tight">Klientský portál</div>
              <div className="text-[11px] text-muted-foreground">Globaal Elevate</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <PortalHeaderActions />
            <div className="ml-1.5 hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight text-foreground">{name}</div>
              {role === 'admin' && <div className="text-[10px] font-medium text-warning-foreground">náhled (admin)</div>}
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{name.slice(0, 1).toUpperCase()}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Odhlásit</button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 lg:px-8"><PortalNav /></div>
      </header>
      <main className="mx-auto max-w-5xl p-4 lg:p-8">{children}</main>
    </div>
  )
}
