'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/app/(auth)/login/password-input'
import { acceptInvite } from './actions'

export function InviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const password = (fd.get('password') as string) || ''
    const confirm = (fd.get('confirm') as string) || ''
    if (password !== confirm) { setError('Hesla se neshodují.'); return }
    startTransition(async () => {
      const res = await acceptInvite(token, password)
      if (res?.error) { setError(res.error); return }
      router.push('/login?invited=1')
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>E-mail</Label>
        <p className="rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{email}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Nové heslo</Label>
        <PasswordInput id="password" name="password" required autoComplete="new-password" placeholder="min. 8 znaků" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Heslo znovu</Label>
        <PasswordInput id="confirm" name="confirm" required autoComplete="new-password" />
      </div>
      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>{pending ? 'Nastavuji…' : 'Nastavit heslo a přihlásit se'}</Button>
    </form>
  )
}
