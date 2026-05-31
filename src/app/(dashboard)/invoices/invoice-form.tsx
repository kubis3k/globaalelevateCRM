'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { createInvoice, updateInvoice } from './actions'

type Client = { id: string; name: string }

export function InvoiceForm({ clients = [], invoice, onDone }: { clients?: Client[]; invoice?: any; onDone?: () => void }) {
  const isEdit = !!invoice
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState<string>(invoice?.client_id || 'none')
  const [clientName, setClientName] = useState<string>(invoice?.client_name || '')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      if (isEdit) {
        await updateInvoice(invoice.id, formData)
        toast.success('Faktura uložena')
        onDone?.()
      } else {
        await createInvoice(formData)
        window.location.reload()
      }
    } catch (e: any) {
      toast.error('Chyba', e.message || 'Doklad se nepodařilo uložit.')
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Typ dokladu</Label>
          <Select name="type" defaultValue={invoice?.type || 'issued'}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Vyberte typ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="issued">Vydaná faktura</SelectItem>
              <SelectItem value="received">Přijatá faktura</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Stav</Label>
          <Select name="status" defaultValue={invoice?.status || 'pending'}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Vyberte stav" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Koncept</SelectItem>
              <SelectItem value="pending">Čeká na úhradu</SelectItem>
              <SelectItem value="paid">Uhrazeno</SelectItem>
              <SelectItem value="overdue">Po splatnosti</SelectItem>
              <SelectItem value="cancelled">Stornováno</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceNumber">Číslo faktury</Label>
        <Input id="invoiceNumber" name="invoiceNumber" required placeholder="FV-20240001" defaultValue={invoice?.invoice_number || ''} />
      </div>

      {clients.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="clientId">Klient (z CRM)</Label>
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              const c = clients.find((x) => x.id === e.target.value)
              if (c) setClientName(c.name)
            }}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="none">— ruční zadání —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="clientName">Odběratel / Dodavatel</Label>
        <Input id="clientName" name="clientName" required placeholder="Název firmy" value={clientName} onChange={(e) => setClientName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Částka</Label>
          <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" defaultValue={invoice?.amount ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Měna</Label>
          <Select name="currency" defaultValue={invoice?.currency || 'CZK'}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Měna" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CZK">CZK</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Datum vystavení</Label>
          <Input id="issueDate" name="issueDate" type="date" required defaultValue={invoice?.issue_date || ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Datum splatnosti</Label>
          <Input id="dueDate" name="dueDate" type="date" required defaultValue={invoice?.due_date || ''} />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        {isEdit ? 'Uložit změny' : 'Vytvořit fakturu'}
      </Button>
    </form>
  )
}
