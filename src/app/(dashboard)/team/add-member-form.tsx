'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addTeamMember } from './actions'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export function AddMemberForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    try {
      await addTeamMember(formData)
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Došlo k chybě.')
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium">{error}</div>}
      
      <div className="space-y-2">
        <Label htmlFor="fullName">Celé jméno</Label>
        <Input id="fullName" name="fullName" required placeholder="Jan Novák" className="focus-visible:ring-indigo-600" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Uživatelské jméno</Label>
        <Input id="username" name="username" required placeholder="jan.novak" className="focus-visible:ring-indigo-600" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Dočasné heslo</Label>
        <Input id="password" name="password" type="password" required className="focus-visible:ring-indigo-600" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" defaultValue="employee">
          <SelectTrigger className="focus-visible:ring-indigo-600">
            <SelectValue placeholder="Vyberte roli" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrátor</SelectItem>
            <SelectItem value="manager">Manažer</SelectItem>
            <SelectItem value="employee">Zaměstnanec</SelectItem>
            <SelectItem value="external">Externista</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Uložit člena
      </Button>
    </form>
  )
}
