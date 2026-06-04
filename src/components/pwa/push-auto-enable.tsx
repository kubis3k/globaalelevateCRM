'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Share } from 'lucide-react'
import { subscribeUser } from '@/lib/push/actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

// Ensures THIS browser's push subscription is registered to the CURRENT user
// (fixes notifications going to the wrong person after a re-login / shared device,
// and makes sure a subscription exists so nothing silently fails to arrive).
async function ensureSubscribed(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!key) return false
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
    }
    const res = await subscribeUser(JSON.parse(JSON.stringify(sub)))
    return !res?.error
  } catch { return false }
}

// Auto-asks for notification permission right after launch (mobile-first), and
// keeps the subscription mapped to the logged-in user on every load.
export function PushAutoEnable() {
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) return
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
    const dismissed = (() => { try { return sessionStorage.getItem('push-banner-dismissed') === '1' } catch { return false } })()
    let cancelled = false

    const run = async () => {
      const perm = Notification.permission
      if (perm === 'granted') { await ensureSubscribed(); return } // re-map to current user every launch
      if (perm === 'denied') return
      // permission === 'default' → prompt right after launch
      if (isIOS && !standalone) { if (!dismissed) { setIosHint(true); setShow(true) } ; return }
      // Try the OS prompt automatically (works on Chrome/Edge/Android). Firefox/Safari
      // need a gesture → fall back to the banner button.
      window.setTimeout(async () => {
        if (cancelled) return
        let granted = false
        try { granted = (await Notification.requestPermission()) === 'granted' } catch { /* needs gesture */ }
        if (cancelled) return
        if (granted) { await ensureSubscribed(); return }
        if (Notification.permission === 'default' && !dismissed) setShow(true)
      }, 700)
    }
    run()
    return () => { cancelled = true }
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') { await ensureSubscribed(); setShow(false) }
      else setShow(false)
    } finally { setBusy(false) }
  }
  function dismiss() { try { sessionStorage.setItem('push-banner-dismissed', '1') } catch { } ; setShow(false) }

  if (!show) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{iosHint ? <Share className="size-5" /> : <Bell className="size-5" />}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Zapnout upozornění</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {iosHint
                ? 'Na iPhonu nejdřív přidej appku na plochu (Sdílet → Přidat na plochu), pak ji otevři z plochy a zapni upozornění.'
                : 'Dostávej upozornění na směny, dovolenou, úkoly i poštu.'}
            </p>
            {!iosHint && (
              <button onClick={enable} disabled={busy} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60">
                <Bell className="size-4" />{busy ? 'Zapínám…' : 'Zapnout'}
              </button>
            )}
          </div>
          <button onClick={dismiss} aria-label="Zavřít" className="-mr-1 -mt-1 rounded p-1.5 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
      </div>
    </div>
  )
}
