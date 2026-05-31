'use client'

import { useState, useTransition } from 'react'
import { Upload, Download, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { uploadDocument, getDocumentUrl, deleteDocument } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const CATEGORIES: Record<string, string> = { contract: 'Smlouva', payslip: 'Výplatnice', id: 'Doklad', other: 'Ostatní' }

type Person = { user_id: string; name: string }

export function DocumentsClient({ documents, people, canManage }: { documents: any[]; people: Person[]; canManage: boolean }) {
  const [showUpload, setShowUpload] = useState(false)
  const [isPending, startTransition] = useTransition()

  function download(id: string) {
    startTransition(async () => {
      const res = await getDocumentUrl(id)
      if (res?.error || !res.url) { toast.error('Chyba', res?.error || 'Nepodařilo se otevřít.'); return }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    })
  }

  async function remove(d: any) {
    const ok = await confirmDialog({ title: `Smazat „${d.name}"?`, description: 'Soubor bude trvale odstraněn.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteDocument(d.id)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Dokument smazán')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{documents.length} {documents.length === 1 ? 'dokument' : 'dokumentů'}</p>
        <Button size="lg" onClick={() => setShowUpload(true)}><Upload className="size-4" />Nahrát dokument</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {documents.length === 0 ? (
          <EmptyState icon={FileText} title="Žádné dokumenty" description="Nahrajte smlouvy, výplatnice nebo jiné dokumenty." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead><TableHead>Kategorie</TableHead>
                {canManage && <TableHead>Zaměstnanec</TableHead>}
                <TableHead>Nahráno</TableHead><TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium text-foreground">{d.name}</TableCell>
                  <TableCell><Badge variant="secondary">{CATEGORIES[d.category] || d.category}</Badge></TableCell>
                  {canManage && <TableCell className="text-muted-foreground">{d.owner_name}</TableCell>}
                  <TableCell className="tabular-nums text-muted-foreground">{new Date(d.created_at).toLocaleDateString('cs-CZ')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Stáhnout" disabled={isPending} onClick={() => download(d.id)}><Download className="size-4" /></Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Smazat" disabled={isPending} className="text-muted-foreground hover:text-destructive" onClick={() => remove(d)}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {showUpload && <UploadDialog people={people} canManage={canManage} onClose={() => setShowUpload(false)} />}
    </div>
  )
}

function UploadDialog({ people, canManage, onClose }: { people: Person[]; canManage: boolean; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await uploadDocument(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success('Dokument nahrán')
      onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nahrát dokument</DialogTitle>
          <DialogDescription>Max. 10 MB. Soubory jsou uloženy v zabezpečeném úložišti.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {canManage && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Zaměstnanec</Label>
              <select name="userId" className={selectClass} defaultValue="">
                <option value="">— já —</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kategorie</Label>
              <select name="category" defaultValue="contract" className={selectClass}>
                {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Název (volitelné)</Label>
              <Input name="name" placeholder="Název dokumentu" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Soubor</Label>
            <input
              type="file"
              name="file"
              required
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Nahrávám…' : 'Nahrát'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
