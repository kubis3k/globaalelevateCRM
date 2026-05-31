'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'

export function DeleteButton({
  action,
  title,
  description,
  successMessage,
  label = 'Smazat',
}: {
  action: () => Promise<unknown>
  title: string
  description?: string
  successMessage?: string
  label?: string
}) {
  const [pending, startTransition] = useTransition()

  async function handleClick() {
    const ok = await confirmDialog({ title, description, confirmLabel: label, destructive: true })
    if (!ok) return
    startTransition(async () => {
      try {
        await action()
        if (successMessage) toast.success(successMessage)
      } catch (e: any) {
        toast.error('Chyba', e?.message || 'Akci se nepodařilo dokončit.')
      }
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={handleClick}
      aria-label={label}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}
