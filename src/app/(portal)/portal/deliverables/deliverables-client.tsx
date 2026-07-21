'use client'

import { useState, useTransition } from 'react'
import { Check, Download, Link as LinkIcon, MessageSquare, PackageCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { decideDeliverable } from '@/lib/deliverables/actions'
import { portalDocUrl } from '../actions'

const STATUS: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
  submitted: { label: 'Čeká na vyjádření', variant: 'secondary' },
  approved: { label: 'Schváleno', variant: 'success' },
  changes_requested: { label: 'Vyžádána úprava', variant: 'destructive' },
}

export function DeliverablesClient({ deliverables }: { deliverables: any[] }) {
  const [pending, start] = useTransition()
  const [changesFor, setChangesFor] = useState<any | null>(null)

  function download(id: string) {
    start(async () => {
      const r = await portalDocUrl(id)
      if (r?.error || !r.url) { toast.error('Chyba', r?.error || 'Nepodařilo se otevřít.'); return }
      window.open(r.url, '_blank', 'noopener,noreferrer')
    })
  }

  async function approve(d: any) {
    const ok = await confirmDialog({ title: `Schválit „${d.title}"?`, confirmLabel: 'Schválit' })
    if (!ok) return
    start(async () => { const r = await decideDeliverable(d.id, 'approved'); if (r?.error) toast.error('Chyba', r.error); else toast.success('Schváleno') })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {deliverables.map((d) => {
        const st = STATUS[d.status] ?? STATUS.submitted
        return (
          <Card key={d.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PackageCheck className="size-4 shrink-0 text-muted-foreground" />
                  <h3 className="font-medium text-foreground">{d.title}</h3>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              {d.description && <p className="text-sm text-foreground/80">{d.description}</p>}
              {d.client_comment && (
                <div className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-xs text-foreground/90">
                  <MessageSquare className="mt-0.5 size-3 shrink-0 text-muted-foreground" />{d.client_comment}
                </div>
              )}
              {(d.document_name || d.external_url) && (
                <div className="flex items-center gap-3 text-sm">
                  {d.document_name && <button onClick={() => download(d.document_id)} disabled={pending} className="inline-flex items-center gap-1 text-primary hover:underline"><Download className="size-3.5" />{d.document_name}</button>}
                  {d.external_url && <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><LinkIcon className="size-3.5" />Odkaz</a>}
                </div>
              )}
              {d.status === 'submitted' && (
                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => setChangesFor(d)}><X className="size-3.5" />Žádám úpravu</Button>
                  <Button size="sm" disabled={pending} onClick={() => approve(d)}><Check className="size-3.5" />Schválit</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {changesFor && <ChangesDialog deliverable={changesFor} onClose={() => setChangesFor(null)} />}
    </div>
  )
}

function ChangesDialog({ deliverable, onClose }: { deliverable: any; onClose: () => void }) {
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const comment = (new FormData(e.currentTarget).get('comment') as string) || ''
    start(async () => {
      const r = await decideDeliverable(deliverable.id, 'changes_requested', comment)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success('Odesláno'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Žádost o úpravu — {deliverable.title}</DialogTitle><DialogDescription>Popište, co je potřeba upravit. Uvidíme to a ozveme se.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input name="comment" required placeholder="Co je potřeba upravit…" autoFocus />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Odesílám…' : 'Odeslat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
