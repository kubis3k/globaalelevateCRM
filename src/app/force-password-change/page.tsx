'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { clearMustChangePassword } from './actions'

// Po přechodu na Neon dostali všichni stávající uživatelé dočasné heslo —
// tahle stránka je donutí ho při prvním přihlášení změnit (viz middleware +
// dashboard layout, které sem přesměrují dokud users.must_change_password).
export default function ForcePasswordChangePage() {
  const router = useRouter()
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { toast.error('Slabé heslo', 'Nové heslo musí mít alespoň 8 znaků.'); return }
    if (pw !== pw2) { toast.error('Hesla se neshodují', 'Zadej dvakrát stejné nové heslo.'); return }
    setBusy(true)
    try {
      const { error } = await authClient.changePassword({ newPassword: pw, currentPassword: cur, revokeOtherSessions: false })
      if (error) { toast.error('Chyba', error.message?.toLowerCase().includes('password') ? 'Dočasné heslo není správné.' : (error.message || 'Heslo se nepodařilo změnit.')); return }
      await clearMustChangePassword()
      toast.success('Heslo bylo změněno')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error('Chyba', err?.message || 'Heslo se nepodařilo změnit.')
    } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Nastav si nové heslo</h1>
          <p className="text-sm text-muted-foreground">Přechod na nový systém — dočasné heslo je potřeba jednou změnit.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Dočasné heslo</Label>
            <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nové heslo</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nové heslo znovu</Label>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" minLength={8} />
          </div>
          <p className="text-[11px] text-muted-foreground">Alespoň 8 znaků. Doporučujeme kombinaci písmen, čísel a symbolů.</p>
          <Button type="submit" disabled={busy} className="w-full">{busy && <Loader2 className="size-4 animate-spin" />}Změnit heslo</Button>
        </form>
      </div>
    </div>
  )
}
