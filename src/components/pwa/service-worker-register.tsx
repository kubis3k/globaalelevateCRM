'use client'

import { useEffect } from 'react'

// Registers the push service worker once on the client. Rendered inside the
// dashboard layout so it runs for every authenticated page.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((e) => console.warn('[pwa] SW registration failed', e))
  }, [])
  return null
}
