'use client'

import { useTransition } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { deleteInvoice, updateInvoiceStatus } from './actions'

export function InvoiceRowActions({ id }: { id: string }) {
  const [, startTransition] = useTransition()

  function setStatus(status: string, message: string) {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(id, status as never)
        toast.success(message)
      } catch (e: any) {
        toast.error('Chyba', e?.message)
      }
    })
  }

  async function onDelete() {
    const ok = await confirmDialog({
      title: 'Odstranit doklad?',
      description: 'Tato akce je nevratná.',
      confirmLabel: 'Odstranit',
      destructive: true,
    })
    if (!ok) return
    startTransition(async () => {
      try {
        await deleteInvoice(id)
        toast.success('Doklad odstraněn')
      } catch (e: any) {
        toast.error('Chyba', e?.message)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Akce" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Změnit stav</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setStatus('paid', 'Označeno jako uhrazeno')}>Uhrazeno</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus('overdue', 'Označeno po splatnosti')}>Po splatnosti</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>Odstranit doklad</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
