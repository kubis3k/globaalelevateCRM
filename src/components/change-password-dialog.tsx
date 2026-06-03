'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'

// Lets the signed-in user set a new password. Verifies the current password
// first (re-auth) so a borrowed/unlocked session can't silently change it.
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() { setCur(''); setPw(''); setPw2('') }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { toast.error('Slabé heslo', 'Nové heslo musí mít alespoň 8 znaků.'); return }
    if (pw !== pw2) { toast.error('Hesla se neshodují', 'Zadej dvakrát stejné nové heslo.'); return }
    setBusy(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email
      if (email) {
        const { error: verr } = await supabase.auth.signInWithPassword({ email, password: cur })
        if (verr) { toast.error('Nesprávné heslo', 'Současné heslo není správné.'); return }
      }
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) { toast.error('Chyba', error.message); return }
      toast.success('Heslo bylo změněno')
      reset(); onClose()
    } catch (err: any) {
      toast.error('Chyba', err?.message || 'Heslo se nepodařilo změnit.')
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Změnit heslo</DialogTitle>
          <DialogDescription>Pro potvrzení zadej současné heslo a nastav nové. Po změně zůstaneš přihlášen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Současné heslo</Label>
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
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => { reset(); onClose() }}>Zrušit</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Změnit heslo</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
