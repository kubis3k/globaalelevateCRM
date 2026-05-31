'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="cs">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#0d1117', color: '#e6edf3', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>Něco se pokazilo</h2>
          <p style={{ fontSize: 14, color: '#9aa4b2', margin: '0 0 16px' }}>
            Aplikaci se nepodařilo načíst. Zkuste obnovit stránku.
          </p>
          <button
            onClick={reset}
            style={{ background: '#6366f1', color: '#fff', border: 0, borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Obnovit
          </button>
        </div>
      </body>
    </html>
  )
}
