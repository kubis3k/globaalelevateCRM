'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { sendPortalMessage } from '../actions'

const textareaClass = 'w-full rounded-lg border border-input bg-background p-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function MessageCompose() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const r = await sendPortalMessage(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success('Zpráva odeslána'); formRef.current?.reset(); router.refresh()
    })
  }
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Předmět</Label><Input name="subject" placeholder="Volitelné — čeho se týká" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Zpráva</Label><textarea name="body" required rows={4} className={textareaClass} placeholder="Napište nám…" /></div>
      <div className="flex justify-end"><Button type="submit" size="lg" disabled={pending}><Send className="size-4" />{pending ? 'Odesílám…' : 'Odeslat'}</Button></div>
    </form>
  )
}
