import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { requireTenant } from '@/lib/supabase/tenant'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { PushAutoEnable } from '@/components/pwa/push-auto-enable'
import { DownloadDesktopBanner } from '@/components/pwa/download-desktop-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, allowedModules } = await requireTenant()
  // Externí uživatelé (klientský portál) nemají přístup do interní appky.
  if (role === 'external') redirect('/portal')
  const username = user.email?.split('@')[0] || 'Uživatel'

  return (
    <AppShell username={username} role={role} allowedModules={allowedModules}>
      {children}
      <ServiceWorkerRegister />
      <PushAutoEnable />
      <InstallPrompt />
      <DownloadDesktopBanner />
    </AppShell>
  )
}
