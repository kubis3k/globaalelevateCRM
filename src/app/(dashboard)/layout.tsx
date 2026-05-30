import { ChevronRight } from 'lucide-react'
import { CollapsibleSidebar } from '@/components/collapsible-sidebar'
import { requireTenant } from '@/lib/supabase/tenant'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, allowedModules } = await requireTenant()

  const username = user.email?.split('@')[0] || 'Uživatel'
  const initials = username.split('.').map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2)

  return (
    <div className="flex min-h-screen bg-background">
      <CollapsibleSidebar username={username} initials={initials} role={role} allowedModules={allowedModules} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-6 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Globaal Elevate</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Production</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  )
}
