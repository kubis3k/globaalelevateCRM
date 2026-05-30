'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTransaction } from './actions'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function AddTransactionForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    try {
      await createTransaction(formData)
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Došlo k chybě při ukládání transakce.')
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium">{error}</div>}
      
      <div className="space-y-2">
        <Label htmlFor="type">Typ transakce</Label>
        <Select name="type" defaultValue="income">
          <SelectTrigger className="focus-visible:ring-indigo-600">
            <SelectValue placeholder="Vyberte typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Příjem</SelectItem>
            <SelectItem value="expense">Výdaj</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Popis / Účel</Label>
        <Input id="description" name="description" required placeholder="Např. Nákup vybavení" className="focus-visible:ring-indigo-600" />
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

      <div className="space-y-2">
        <Label htmlFor="date">Datum transakce</Label>
        <Input id="date" name="date" type="date" required className="focus-visible:ring-indigo-600" />
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Uložit transakci
      </Button>
    </form>
  )
}
