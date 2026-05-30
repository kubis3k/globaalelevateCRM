import { AppShell } from '@/components/app-shell'
import { requireTenant } from '@/lib/supabase/tenant'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, allowedModules } = await requireTenant()
  const username = user.email?.split('@')[0] || 'Uživatel'

  return (
    <AppShell username={username} role={role} allowedModules={allowedModules}>
      {children}
    </AppShell>
  )
}
