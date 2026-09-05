'use client'

import { useState } from 'react'
import { Bell, Settings } from 'lucide-react'
import { PushSetupDialog } from '@/components/pwa/push-setup-dialog'
import { ChangePasswordDialog } from '@/components/change-password-dialog'

// Ikony v portál headeru: oznámení (push) + nastavení (změna hesla).
const btn =
  'rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'

export function PortalHeaderActions() {
  const [showPush, setShowPush] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setShowPush(true)} aria-label="Oznámení" title="Oznámení" className={btn}>
        <Bell className="size-5" />
      </button>
      <button type="button" onClick={() => setShowPassword(true)} aria-label="Nastavení" title="Nastavení" className={btn}>
        <Settings className="size-5" />
      </button>
      <PushSetupDialog open={showPush} onClose={() => setShowPush(false)} />
      <ChangePasswordDialog open={showPassword} onClose={() => setShowPassword(false)} />
    </>
  )
}
