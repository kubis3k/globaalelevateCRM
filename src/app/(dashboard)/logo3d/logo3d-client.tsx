'use client'

import dynamic from 'next/dynamic'

// Client-only: three.js + WASM, lazy-loaded (no SSR), so it doesn't bloat first paint.
const Logo3DStudio = dynamic(() => import('@/components/logo3d-studio').then((m) => m.Logo3DStudio), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Načítám 3D studio…</div>
  ),
})

export function Logo3DStudioClient() {
  return (
    <div className="overflow-hidden rounded-xl border border-border" style={{ height: '80vh' }}>
      <Logo3DStudio />
    </div>
  )
}
