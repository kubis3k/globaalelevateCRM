'use client'

import { useEffect, useState } from 'react'
import { Monitor, X, Download } from 'lucide-react'

// Instalátory jsou servírované přímo webem z public/downloads
// (Windows: lokální build, Mac: GitHub Actions workflow desktop-build.yml).
const WIN_URL = '/downloads/GlobaalElevateWork-Setup.exe'
const MAC_ARM_URL = '/downloads/GlobaalElevateWork-arm64.dmg'
const MAC_X64_URL = '/downloads/GlobaalElevateWork-x64.dmg'
const DISMISS_KEY = 'desktop-app-banner-dismissed'

// Doporučení stáhnout desktopovou aplikaci. Zobrazuje se jen ve webovém
// prohlížeči na počítači — ne uvnitř samotné desktop appky (UA "Electron")
// a ne na mobilech (tam je PWA instalace). Zavření se pamatuje.
export function DownloadDesktopBanner() {
  const [platform, setPlatform] = useState<'win' | 'mac' | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    if (ua.includes('Electron')) return
    if (localStorage.getItem(DISMISS_KEY)) return
    setPlatform(/Macintosh|Mac OS X/.test(ua) ? 'mac' : 'win')
  }, [])

  if (!platform) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setPlatform(null)
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 hidden w-80 rounded-xl border border-border bg-card p-4 shadow-lg lg:block">
      <button
        onClick={dismiss}
        aria-label="Zavřít"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Monitor className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Aplikace pro počítač</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Vlastní okno, trvalé přihlášení a rychlejší přístup — stejná data, vždy aktuální verze.
          </p>
          <div className="mt-3 space-y-1.5">
            <a
              href={platform === 'mac' ? MAC_ARM_URL : WIN_URL}
              download
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="size-3.5" />
              {platform === 'mac' ? 'Stáhnout pro Mac (Apple Silicon)' : 'Stáhnout pro Windows'}
            </a>
            <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
              {platform === 'mac' ? (
                <>
                  <a href={MAC_X64_URL} download onClick={dismiss} className="underline-offset-2 hover:text-foreground hover:underline">Mac s Intelem</a>
                  <a href={WIN_URL} download onClick={dismiss} className="underline-offset-2 hover:text-foreground hover:underline">Windows</a>
                </>
              ) : (
                <>
                  <a href={MAC_ARM_URL} download onClick={dismiss} className="underline-offset-2 hover:text-foreground hover:underline">Mac (Apple Silicon)</a>
                  <a href={MAC_X64_URL} download onClick={dismiss} className="underline-offset-2 hover:text-foreground hover:underline">Mac (Intel)</a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
