'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, CheckCircle2, Clock, Trash2, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { deleteInvoice, updateInvoiceStatus } from './actions'
import { InvoiceForm } from './invoice-form'

type Client = { id: string; name: string }

export function InvoiceRowActions({ invoice, clients }: { invoice: any; clients: Client[] }) {
  const [, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)

  function setStatus(status: string, message: string) {
    startTransition(async () => {
      try { await updateInvoiceStatus(invoice.id, status as never); toast.success(message) }
      catch (e: any) { toast.error('Chyba', e?.message) }
    })
  }

  async function onDelete() {
    const ok = await confirmDialog({ title: 'Odstranit doklad?', description: 'Tato akce je nevratná.', confirmLabel: 'Odstranit', destructive: true })
    if (!ok) return
    startTransition(async () => {
      try { await deleteInvoice(invoice.id); toast.success('Doklad odstraněn') }
      catch (e: any) { toast.error('Chyba', e?.message) }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Akce" className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-muted-foreground')}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil />Upravit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.assign(`/api/invoices/${invoice.id}/isdoc`)}><FileDown />Export ISDOC</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Změnit stav</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setStatus('paid', 'Označeno jako uhrazeno')}><CheckCircle2 />Uhrazeno</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatus('overdue', 'Označeno po splatnosti')}><Clock />Po splatnosti</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 />Odstranit doklad</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upravit fakturu</DialogTitle>
            <DialogDescription>Změny se u uhrazených faktur promítnou do financí.</DialogDescription>
          </DialogHeader>
          <InvoiceForm clients={clients} invoice={invoice} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
