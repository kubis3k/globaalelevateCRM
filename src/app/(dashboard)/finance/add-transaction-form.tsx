'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTransaction } from './actions'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/toast'

export function AddTransactionForm() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await createTransaction(formData)
      window.location.reload()
    } catch (e: any) {
      toast.error('Chyba', e.message || 'Došlo k chybě při ukládání transakce.')
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">

      <div className="space-y-2">
        <Label htmlFor="type">Typ transakce</Label>
        <Select name="type" defaultValue="income">
          <SelectTrigger>
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
        <Input id="description" name="description" required placeholder="Např. Nákup vybavení" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Částka</Label>
          <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Měna</Label>
          <Select name="currency" defaultValue="CZK">
            <SelectTrigger>
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
        <Input id="date" name="date" type="date" required />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Uložit transakci
      </Button>
    </form>
  )
}
