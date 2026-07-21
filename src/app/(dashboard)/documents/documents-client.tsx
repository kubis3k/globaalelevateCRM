'use client'

import { useMemo, useState, useTransition } from 'react'
import { Upload, Download, Trash2, FolderOpen, Mail, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { DOC_CATEGORIES } from '@/lib/documents'
import { uploadDocument, getDocumentUrl, deleteDocument } from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const fmtBytes = (n: number | null) => {
  if (!n || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

type Doc = {
  id: string; name: string; category: string; source: string; source_ref: string | null
  file_size: number | null; created_at: string; uploaded_by: string | null; uploader_name: string
  client_id: string | null; client_name: string | null
}
type Opt = { id: string; name: string }

export function DocumentsClient({ documents, clients, currentUserId, canManage }: { documents: Doc[]; clients: Opt[]; currentUserId: string; canManage: boolean }) {
  const [showUpload, setShowUpload] = useState(false)
  const [filter, setFilter] = useState('all')
  const [isPending, startTransition] = useTransition()

  const shown = useMemo(
    () => (filter === 'all' ? documents : documents.filter((d) => d.category === filter)),
    [documents, filter],
  )

  function download(id: string) {
    startTransition(async () => {
      const res = await getDocumentUrl(id)
      if (res?.error || !res.url) { toast.error('Chyba', res?.error || 'Nepodařilo se otevřít.'); return }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    })
  }

  async function remove(d: Doc) {
    const ok = await confirmDialog({ title: `Smazat „${d.name}"?`, description: 'Soubor bude trvale odstraněn.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteDocument(d.id)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Dokument smazán')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{documents.length} {documents.length === 1 ? 'dokument' : documents.length >= 2 && documents.length <= 4 ? 'dokumenty' : 'dokumentů'}</p>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${selectClass} w-auto`}>
            <option value="all">Všechny kategorie</option>
            {Object.entries(DOC_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <Button size="lg" onClick={() => setShowUpload(true)}><Upload className="size-4" />Nahrát dokument</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {shown.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Žádné dokumenty" description="Nahrajte soubor nebo uložte přílohu přímo z modulu Pošta." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Zdroj</TableHead>
                <TableHead className="text-right">Velikost</TableHead>
                <TableHead>Nahrál</TableHead>
                <TableHead>Nahráno</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((d) => {
                const canDelete = canManage || d.uploaded_by === currentUserId
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-foreground">
                      <span title={d.source_ref || undefined}>{d.name}</span>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{DOC_CATEGORIES[d.category] || d.category}</Badge></TableCell>
                    <TableCell>{d.client_name ? <Badge variant="info">{d.client_name}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {d.source === 'mail'
                        ? <Badge variant="outline" className="gap-1 text-[11px]"><Mail className="size-3" />Z pošty</Badge>
                        : <Badge variant="outline" className="gap-1 text-[11px]"><HardDrive className="size-3" />Ručně</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtBytes(d.file_size)}</TableCell>
                    <TableCell className="text-muted-foreground">{d.uploader_name}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{new Date(d.created_at).toLocaleDateString('cs-CZ')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Stáhnout" disabled={isPending} onClick={() => download(d.id)}><Download className="size-4" /></Button>
                        {canDelete && <Button variant="ghost" size="icon-sm" aria-label="Smazat" disabled={isPending} className="text-muted-foreground hover:text-destructive" onClick={() => remove(d)}><Trash2 className="size-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {showUpload && <UploadDialog clients={clients} onClose={() => setShowUpload(false)} />}
    </div>
  )
}

function UploadDialog({ clients, onClose }: { clients: Opt[]; onClose: () => void }) {
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
          <DialogDescription>Max. 25 MB. Soubory jsou uloženy v zabezpečeném úložišti.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kategorie</Label>
              <select name="category" defaultValue="other" className={selectClass}>
                {Object.entries(DOC_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Název (volitelné)</Label>
              <Input name="name" placeholder="Název dokumentu" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Popis (volitelné)</Label>
            <Input name="description" placeholder="Krátká poznámka" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Klient (volitelné — sdílí se automaticky v portálu)</Label>
            <select name="clientId" defaultValue="none" className={selectClass}>
              <option value="none">— interní, nikomu se nesdílí —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
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
