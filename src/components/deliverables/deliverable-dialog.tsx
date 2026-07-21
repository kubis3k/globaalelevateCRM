'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { DOCUMENTS_BUCKET } from '@/lib/documents'
import { createUploadUrl, finalizeUpload } from '@/app/(dashboard)/documents/actions'
import { createDeliverable } from '@/lib/deliverables/actions'

export const DELIVERABLE_STATUS: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
  submitted: { label: 'Odesláno klientovi', variant: 'secondary' },
  approved: { label: 'Schváleno', variant: 'success' },
  changes_requested: { label: 'Žádost o úpravu', variant: 'destructive' },
}

// Staff nahraje soubor nebo přiloží odkaz — odešle se ke schválení do
// klientského portálu. Sdíleno mezi detailem Projektu a Akce.
export function DeliverableDialog({ projectId, eventId, onClose }: { projectId?: string; eventId?: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const file = fileRef.current?.files?.[0] || null
    startTransition(async () => {
      if (file) {
        const up = await createUploadUrl(file.name)
        if (up.error || !up.path || !up.token) { toast.error('Chyba', up.error || 'Nahrání se nepodařilo připravit.'); return }
        const supabase = createClient()
        const { error: upErr } = await supabase.storage.from(DOCUMENTS_BUCKET).uploadToSignedUrl(up.path, up.token, file)
        if (upErr) { toast.error('Chyba', upErr.message); return }
        const fin = await finalizeUpload({ path: up.path, name: file.name, contentType: file.type || undefined, size: file.size, category: 'other' })
        if (fin.error || !fin.id) { toast.error('Chyba', fin.error || 'Uložení dokumentu selhalo.'); return }
        fd.set('documentId', fin.id)
      }
      if (projectId) fd.set('projectId', projectId)
      if (eventId) fd.set('eventId', eventId)
      const res = await createDeliverable(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success('Dodávka odeslána klientovi'); onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Odeslat dodávku klientovi</DialogTitle><DialogDescription>Klient dodávku uvidí ve svém portálu a bude ji moct schválit nebo vrátit s komentářem.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required placeholder="např. Návrh vizuálu — verze 1" /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis (volitelné)</Label><Input name="description" placeholder="Krátký komentář ke klientovi" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Soubor</Label>
            <input ref={fileRef} type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90" />
            {fileName && <p className="text-[11px] text-muted-foreground">Nahraje se: <span className="text-foreground">{fileName}</span></p>}
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">…nebo odkaz (volitelné)</Label><Input name="externalUrl" placeholder="https://" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Odesílám…' : 'Odeslat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
