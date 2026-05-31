'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the real error in the console for debugging (production masks the message).
    console.error('Dashboard segment error:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Něco se pokazilo</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Tuto akci se nepodařilo dokončit. Zkuste to prosím znovu.
      </p>
      {error?.digest && <p className="mt-1 font-mono text-[11px] text-muted-foreground/60">ref: {error.digest}</p>}
      <Button onClick={reset} size="lg" className="mt-4">Zkusit znovu</Button>
    </div>
  )
}
