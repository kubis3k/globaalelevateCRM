'use client'

import dynamic from 'next/dynamic'
import { uploadDocument } from '../documents/actions'
import { toast } from '@/components/ui/toast'

// Client-only: three.js + WASM, lazy-loaded (no SSR), so it doesn't bloat first paint.
const Logo3DStudio = dynamic(() => import('@/components/logo3d-studio').then((m) => m.Logo3DStudio), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Načítám 3D studio…</div>
  ),
})

export function Logo3DStudioClient() {
  // Save the rendered 3D logo (PNG) into the Documents module so it can be
  // dropped onto an animated background in the Animation studio.
  async function saveToDocuments(dataUrl: string, name: string) {
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const fname = `${(name || '3D logo').trim()}.png`
      const fd = new FormData()
      fd.set('file', new File([blob], fname, { type: 'image/png' }))
      fd.set('name', fname)
      fd.set('category', 'other')
      const res = await uploadDocument(fd)
      if (res?.error) toast.error('Chyba', res.error)
      else toast.success('Uloženo do Dokumentů', 'Najdeš ho v Animačním studiu (Import z Dokumentů).')
    } catch (e: any) {
      toast.error('Chyba', e?.message || 'Uložení selhalo.')
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border" style={{ height: '80vh' }}>
      <Logo3DStudio onSaveToDocuments={saveToDocuments} />
    </div>
  )
}
