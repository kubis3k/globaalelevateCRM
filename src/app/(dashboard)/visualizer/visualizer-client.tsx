'use client'

import dynamic from 'next/dynamic'

export type VizDoc = { id: string; name: string; kind: 'image' | 'video' }

// Client-only: three.js scene, lazy-loaded (no SSR) to keep first paint light.
const ClubVisualizer = dynamic(() => import('@/components/club-visualizer/ClubVisualizer').then((m) => m.ClubVisualizer), {
  ssr: false,
  loading: () => <div className="flex h-[70vh] items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">Načítám 3D model klubu…</div>,
})

export function VisualizerClient({ documents }: { documents: VizDoc[] }) {
  return <ClubVisualizer documents={documents} />
}
