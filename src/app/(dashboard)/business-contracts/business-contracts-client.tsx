'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, FileSignature, Check, Download, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { upload } from '@vercel/blob/client'
import { createBusinessContract, updateBusinessContract, deleteBusinessContract, toggleAcknowledged } from './actions'
import { finalizeUpload, getDocumentUrl } from '../documents/actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const PARTY: Record<string, string> = { artist: 'Umělec', rental: 'Pronájem', supplier: 'Dodavatel', client: 'Klient', other: 'Ostatní' }
const STATUS: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  active: { label: 'Aktivní', variant: 'success' },
  expired: { label: 'Vypršela', variant: 'destructive' },
  terminated: { label: 'Ukončena', variant: 'secondary' },
}

type Opt = { id: string; name: string }

function expiry(end: string | null, status: string) {
  if (!end || status === 'terminated') return null
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  if (end < today) return { label: 'Po expiraci', variant: 'destructive' as const }
  if (end <= soon) return { label: 'Brzy vyprší', variant: 'warning' as const }
  return null
}

/** Upload a file straight to Storage (Documents library) and return its document id.
 * Přebírá clientId smlouvy, aby se příloha automaticky sdílela stejnému klientovi v portálu. */
async function uploadToDocuments(file: File, clientId: string | null): Promise<string | null> {
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
  const pathname = `documents/${crypto.randomUUID()}${ext}`
  let path: string
  try {
    const blob = await upload(pathname, file, { access: 'private', handleUploadUrl: '/api/blob/documents', contentType: file.type || undefined })
    path = blob.pathname
  } catch (e: any) { toast.error('Chyba', e?.message || 'Nahrání se nepodařilo připravit.'); return null }
  const fin = await finalizeUpload({ path, name: file.name, contentType: file.type || undefined, size: file.size, category: 'contract', clientId })
  if (fin.error || !fin.id) { toast.error('Chyba', fin.error || 'Uložení dokumentu selhalo.'); return null }
  return fin.id
}

export function BusinessContractsClient({ contracts, suppliers, clients, events, documents }: { contracts: any[]; suppliers: Opt[]; clients: Opt[]; events: Opt[]; documents: Opt[] }) {
  const [dialog, setDialog] = useState<{ item: any | null } | null>(null)
  const [isPending, start] = useTransition()

  function ack(c: any) {
    start(async () => { const r = await toggleAcknowledged(c.id, !c.acknowledged_at); if (r?.error) toast.error('Chyba', r.error); else toast.success(c.acknowledged_at ? 'Akceptace zrušena' : 'Akceptováno') })
  }
  function downloadDoc(id: string) {
    start(async () => { const r = await getDocumentUrl(id); if (r?.error || !r.url) toast.error('Chyba', r?.error || 'Nepodařilo se otevřít.'); else window.open(r.url, '_blank', 'noopener,noreferrer') })
  }
  async function remove(c: any) {
    const ok = await confirmDialog({ title: `Smazat smlouvu „${c.title}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deleteBusinessContract(c.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{contracts.length} smluv</p>
        <Button size="lg" onClick={() => setDialog({ item: null })}><Plus className="size-4" />Nová smlouva</Button>
      </div>

      {contracts.length === 0 ? (
        <EmptyState icon={FileSignature} title="Žádné smlouvy" description="Eviduj smlouvy s umělci, pronájmy a dodavateli — vč. přílohy, expirace a akceptace." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Protistrana</TableHead>
                <TableHead>Platnost</TableHead>
                <TableHead className="text-right">Hodnota</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead>Akceptace</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => {
                const st = STATUS[c.status] ?? STATUS.active
                const ex = expiry(c.end_date, c.status)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">
                      <span className="inline-flex items-center gap-1.5">{c.title}{c.document_id && <Paperclip className="size-3.5 text-muted-foreground" />}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground"><span className="text-xs text-muted-foreground">{PARTY[c.party_type] ?? c.party_type}</span><div>{c.party_name || '—'}</div></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('cs-CZ') : '—'} – {c.end_date ? new Date(c.end_date).toLocaleDateString('cs-CZ') : '—'}
                      {ex && <Badge variant={ex.variant} className="ml-1.5 h-4 px-1.5 text-[10px]">{ex.label}</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">{c.value != null ? czk(Number(c.value), c.currency) : '—'}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell>
                      {c.client_id ? (
                        // Klient s vlastním portálovým přístupem akceptuje sám v /portal/contracts.
                        c.acknowledged_at
                          ? <Badge variant="success">Odsouhlaseno klientem {new Date(c.acknowledged_at).toLocaleDateString('cs-CZ')}</Badge>
                          : <Badge variant="secondary">Čeká na klienta</Badge>
                      ) : c.acknowledged_at
                        ? <Badge variant="success" className="cursor-pointer" onClick={() => ack(c)}>Akceptováno</Badge>
                        : <Button variant="outline" size="sm" disabled={isPending} onClick={() => ack(c)}><Check className="size-3.5" />Akceptovat</Button>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {c.document_id && <Button variant="ghost" size="icon-xs" aria-label="Stáhnout smlouvu" title={c.document_name || 'Stáhnout přílohu'} disabled={isPending} onClick={() => downloadDoc(c.document_id)}><Download className="size-3.5" /></Button>}
                        <Button variant="ghost" size="icon-xs" aria-label="Upravit" disabled={isPending} onClick={() => setDialog({ item: c })}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(c)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {dialog && <ContractDialog item={dialog.item} suppliers={suppliers} clients={clients} events={events} documents={documents} onClose={() => setDialog(null)} />}
    </div>
  )
}

function ContractDialog({ item, suppliers, clients, events, documents, onClose }: { item: any | null; suppliers: Opt[]; clients: Opt[]; events: Opt[]; documents: Opt[]; onClose: () => void }) {
  const [pending, start] = useTransition()
  const [docId, setDocId] = useState<string>(item?.document_id ?? 'none')
  const [fileName, setFileName] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const file = fileRef.current?.files?.[0] || null
    const fd = new FormData(formEl)
    start(async () => {
      let documentId = docId
      if (file) {
        const clientId = (fd.get('clientId') as string) || 'none'
        const id = await uploadToDocuments(file, clientId !== 'none' ? clientId : null)
        if (!id) return
        documentId = id
      }
      fd.set('documentId', documentId)
      const r = item ? await updateBusinessContract(item.id, fd) : await createBusinessContract(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success(item ? 'Smlouva upravena' : 'Smlouva přidána'); onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{item ? 'Upravit smlouvu' : 'Nová smlouva'}</DialogTitle><DialogDescription>Smlouva s umělcem, pronájem, dodavatel…</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required defaultValue={item?.title ?? ''} placeholder="např. Vystoupení DJ XY" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Typ protistrany</Label>
              <select name="partyType" defaultValue={item?.party_type ?? 'other'} className={selectClass}>{Object.entries(PARTY).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Protistrana (text)</Label><Input name="counterparty" defaultValue={item?.counterparty ?? ''} placeholder="jméno / firma" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dodavatel</Label>
              <select name="supplierId" defaultValue={item?.supplier_id ?? 'none'} className={selectClass}><option value="none">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CRM klient</Label>
              <select name="clientId" defaultValue={item?.client_id ?? 'none'} className={selectClass}><option value="none">—</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Akce</Label>
              <select name="eventId" defaultValue={item?.event_id ?? 'none'} className={selectClass}><option value="none">—</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stav</Label>
              <select name="status" defaultValue={item?.status ?? 'active'} className={selectClass}>{Object.entries(STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Začátek</Label><Input type="date" name="startDate" defaultValue={item?.start_date ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Konec / expirace</Label><Input type="date" name="endDate" defaultValue={item?.end_date ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Hodnota</Label><Input type="number" step="0.01" name="value" defaultValue={item?.value ?? ''} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Typ smlouvy</Label><Input name="type" defaultValue={item?.type ?? ''} placeholder="např. vystoupení, pronájem" /></div>
          </div>

          {/* Příloha smlouvy: nahrát z PC nebo vybrat ze sdílených Dokumentů */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label className="text-xs font-medium text-muted-foreground">Soubor smlouvy (volitelné)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">Nahrát z PC</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                  className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">…nebo ze sdílených Dokumentů</span>
                <select value={docId} onChange={(e) => setDocId(e.target.value)} disabled={!!fileName} className={selectClass}>
                  <option value="none">— bez přílohy —</option>
                  {documents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            {fileName
              ? <p className="text-[11px] text-muted-foreground">Nahraje se: <span className="text-foreground">{fileName}</span> (uloží se i do Dokumentů)</p>
              : item?.document_name && docId === item?.document_id && <p className="text-[11px] text-muted-foreground">Aktuální příloha: <span className="text-foreground">{item.document_name}</span></p>}
          </div>

          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Poznámka</Label><Input name="note" defaultValue={item?.note ?? ''} /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : item ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
