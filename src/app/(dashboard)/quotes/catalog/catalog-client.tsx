'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Pencil, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { createCatalogItem, updateCatalogItem, deleteCatalogItem } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const KIND: Record<string, string> = { product: 'Produkt', service: 'Služba' }

export function CatalogClient({ items }: { items: any[] }) {
  const [dialog, setDialog] = useState<{ item: any | null } | null>(null)
  const [isPending, startTransition] = useTransition()

  async function remove(it: any) {
    const ok = await confirmDialog({ title: `Smazat „${it.name}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteCatalogItem(it.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Položka smazána') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{items.length} položek v katalogu</p>
        <Button size="lg" onClick={() => setDialog({ item: null })}><Plus className="size-4" />Nová položka</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Package} title="Prázdný katalog" description="Přidej produkty nebo služby pro rychlé sestavování nabídek." />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Jednotka</TableHead>
                <TableHead className="text-right">Cena / j.</TableHead>
                <TableHead className="text-right">DPH</TableHead>
                <TableHead>Aktivní</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium text-foreground">{it.name}</TableCell>
                  <TableCell className="text-muted-foreground">{KIND[it.kind] ?? it.kind}</TableCell>
                  <TableCell className="text-muted-foreground">{it.unit}</TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">{czk(Number(it.unit_price), it.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{Number(it.vat_rate)} %</TableCell>
                  <TableCell>{it.active ? <Badge variant="success">Ano</Badge> : <Badge variant="secondary">Ne</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" aria-label="Upravit" disabled={isPending} onClick={() => setDialog({ item: it })}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(it)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialog && <CatalogDialog item={dialog.item} onClose={() => setDialog(null)} />}
    </div>
  )
}

function CatalogDialog({ item, onClose }: { item: any | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = item ? await updateCatalogItem(item.id, fd) : await createCatalogItem(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(item ? 'Položka upravena' : 'Položka přidána'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? 'Upravit položku' : 'Nová položka'}</DialogTitle><DialogDescription>Produkt nebo služba v katalogu.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="name" required defaultValue={item?.name ?? ''} placeholder="např. Konzultace" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Typ</Label>
              <select name="kind" defaultValue={item?.kind ?? 'service'} className={selectClass}><option value="service">Služba</option><option value="product">Produkt</option></select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Jednotka</Label><Input name="unit" defaultValue={item?.unit ?? 'ks'} placeholder="ks / hod" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Cena / jednotka</Label><Input type="number" step="0.01" min="0" name="unitPrice" defaultValue={item?.unit_price ?? ''} placeholder="0" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">DPH (%)</Label><Input type="number" step="1" min="0" name="vatRate" defaultValue={item?.vat_rate ?? 21} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis</Label><Input name="description" defaultValue={item?.description ?? ''} /></div>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="active" defaultChecked={item ? item.active : true} className="size-4 rounded border-input accent-primary" />
            Aktivní (nabízet v nabídkách)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : item ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
