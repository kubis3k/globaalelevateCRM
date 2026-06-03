'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { createSupplier, updateSupplier, deleteSupplier } from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
export const CATEGORY: Record<string, string> = { artist: 'Umělec', security: 'Security', rental: 'Půjčovna', drinks: 'Nápoje', other: 'Ostatní' }

export function SuppliersClient({ suppliers }: { suppliers: any[] }) {
  const [dialog, setDialog] = useState<{ item: any | null } | null>(null)
  const [isPending, start] = useTransition()

  async function remove(s: any) {
    const ok = await confirmDialog({ title: `Smazat dodavatele „${s.name}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deleteSupplier(s.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Dodavatel smazán') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{suppliers.length} dodavatelů</p>
        <Button size="lg" onClick={() => setDialog({ item: null })}><Plus className="size-4" />Nový dodavatel</Button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="Žádní dodavatelé" description="Přidej umělce, agenturu, půjčovnu nebo dodavatele nápojů." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>IČO</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                  <TableCell><Badge variant="secondary">{CATEGORY[s.category] ?? s.category}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{s.ico || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" aria-label="Upravit" disabled={isPending} onClick={() => setDialog({ item: s })}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(s)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialog && <SupplierDialog item={dialog.item} onClose={() => setDialog(null)} />}
    </div>
  )
}

function SupplierDialog({ item, onClose }: { item: any | null; onClose: () => void }) {
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const r = item ? await updateSupplier(item.id, fd) : await createSupplier(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success(item ? 'Dodavatel upraven' : 'Dodavatel přidán'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Upravit dodavatele' : 'Nový dodavatel'}</DialogTitle><DialogDescription>Umělec, security, půjčovna, nápoje…</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="name" required defaultValue={item?.name ?? ''} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kategorie</Label>
              <select name="category" defaultValue={item?.category ?? 'other'} className={selectClass}>{Object.entries(CATEGORY).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">IČO</Label><Input name="ico" defaultValue={item?.ico ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">DIČ</Label><Input name="dic" defaultValue={item?.dic ?? ''} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Telefon</Label><Input name="phone" defaultValue={item?.phone ?? ''} /></div>
            <div className="space-y-1.5 col-span-2"><Label className="text-xs text-muted-foreground">E-mail</Label><Input type="email" name="email" defaultValue={item?.email ?? ''} /></div>
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
