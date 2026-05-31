import type { MetadataRoute } from 'next'

// Web app manifest (App Router file convention). Makes the CRM installable as
// a standalone PWA on mobile + desktop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Globaal Elevate Production',
    short_name: 'Globaal',
    description: 'Interní firemní systém — Globaal Elevate Production',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366f1',
    lang: 'cs',
    dir: 'ltr',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
