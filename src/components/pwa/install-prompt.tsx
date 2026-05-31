'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'

// Unobtrusive, dismissible "install to home screen" banner shown on mobile when
// the app isn't already installed. Uses beforeinstallprompt on Android/desktop
// Chromium; falls back to an iOS hint (Safari has no programmatic prompt).
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    if (standalone) return
    try { if (localStorage.getItem('ge_install_dismissed') === '1') return } catch { /* ignore */ }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    const onBIP = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', onBIP)
    if (ios) setShow(true) // iOS never fires beforeinstallprompt
    return () => window.removeEventListener('beforeinstallprompt', onBIP)
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem('ge_install_dismissed', '1') } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return
    deferred.prompt()
    try { await deferred.userChoice } catch { /* ignore */ }
    setDeferred(null)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg lg:hidden">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Download className="size-5" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium text-foreground">Nainstalovat appku</div>
        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          {isIOS ? <>Sdílet <Share className="size-3" /> → Přidat na plochu</> : 'Přidej Globaal Elevate na plochu'}
        </div>
      </div>
      {!isIOS && deferred && (
        <button onClick={install} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          Instalovat
        </button>
      )}
      <button onClick={dismiss} aria-label="Zavřít" className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <X className="size-4" />
      </button>
    </div>
  )
}
