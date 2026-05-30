'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createInvoice } from './actions'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function AddInvoiceForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    try {
      await createInvoice(formData)
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Došlo k chybě při vytváření faktury.')
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium">{error}</div>}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Typ dokladu</Label>
          <Select name="type" defaultValue="issued">
            <SelectTrigger className="focus-visible:ring-indigo-600">
              <SelectValue placeholder="Vyberte typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="issued">Vydaná faktura</SelectItem>
              <SelectItem value="received">Přijatá faktura</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Stav</Label>
          <Select name="status" defaultValue="pending">
            <SelectTrigger className="focus-visible:ring-indigo-600">
              <SelectValue placeholder="Vyberte stav" />
            </SelectTrigger>
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
        <Input id="invoiceNumber" name="invoiceNumber" required placeholder="FV-20240001" className="focus-visible:ring-indigo-600" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientName">Odběratel / Dodavatel</Label>
        <Input id="clientName" name="clientName" required placeholder="Název firmy" className="focus-visible:ring-indigo-600" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Částka</Label>
          <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" className="focus-visible:ring-indigo-600" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Měna</Label>
          <Select name="currency" defaultValue="CZK">
            <SelectTrigger className="focus-visible:ring-indigo-600">
              <SelectValue placeholder="Měna" />
            </SelectTrigger>
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
          <Input id="issueDate" name="issueDate" type="date" required className="focus-visible:ring-indigo-600" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Datum splatnosti</Label>
          <Input id="dueDate" name="dueDate" type="date" required className="focus-visible:ring-indigo-600" />
        </div>
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Vytvořit fakturu
      </Button>
    </form>
  )
}
