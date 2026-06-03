'use client'

import { useTransition } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { portalDocUrl } from '../actions'

export function DocDownload({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await portalDocUrl(id)
          if (res?.error) { toast.error('Chyba', res.error); return }
          if (res.url) window.open(res.url, '_blank')
        })
      }
    >
      <Download className="size-3.5" />
      {pending ? 'Připravuji…' : 'Stáhnout'}
    </Button>
  )
}
