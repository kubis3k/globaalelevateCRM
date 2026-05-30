'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createEvent } from './actions'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function AddEventForm({ users }: { users: any[] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    try {
      await createEvent(formData)
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Došlo k chybě při vytváření události.')
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium">{error}</div>}
      
      <div className="space-y-2">
        <Label htmlFor="title">Název události / Úkolu</Label>
        <Input id="title" name="title" required placeholder="Např. Porada týmu" className="focus-visible:ring-indigo-600" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Popis</Label>
        <Input id="description" name="description" placeholder="Detaily..." className="focus-visible:ring-indigo-600" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_time">Začátek</Label>
          <Input id="start_time" name="start_time" type="datetime-local" required className="focus-visible:ring-indigo-600" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">Konec</Label>
          <Input id="end_time" name="end_time" type="datetime-local" required className="focus-visible:ring-indigo-600" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assigned_to">Přiřadit (Volitelné)</Label>
        <Select name="assigned_to">
          <SelectTrigger className="focus-visible:ring-indigo-600">
            <SelectValue placeholder="Vyberte člena týmu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nepřiřazovat</SelectItem>
            {users.map(u => (
              <SelectItem key={u.user_id} value={u.user_id}>{u.profiles?.full_name || u.profiles?.username}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Uložit událost
      </Button>
    </form>
  )
}
