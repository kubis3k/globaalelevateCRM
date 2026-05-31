'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createCrmClient, updateCrmClient, deleteCrmClient, lookupAres } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const STATUS: Record<string, { variant: 'success' | 'secondary' | 'info'; label: string }> = {
  active: { variant: 'success', label: 'Aktivní' },
  inactive: { variant: 'secondary', label: 'Neaktivní' },
  lead: { variant: 'info', label: 'Lead' },
}

type Person = { user_id: string; name: string }

export function ClientsClient({ clients, people }: { clients: any[]; people: Person[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; client: any | null }>({ open: false, client: null })
  const [isPending, startTransition] = useTransition()

  async function remove(c: any) {
    const ok = await confirmDialog({ title: `Smazat klienta „${c.name}"?`, description: 'Smaže i kontakty a aktivity; faktury zůstanou (odpojí se).', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => { const res = await deleteCrmClient(c.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Klient smazán') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{clients.length} {clients.length === 1 ? 'klient' : 'klientů'}</p>
        <Button size="lg" onClick={() => setDialog({ open: true, client: null })}><Plus className="size-4" />Nový klient</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {clients.length === 0 ? (
          <EmptyState icon={Building2} title="Žádní klienti" description="Přidejte první firmu do CRM." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Klient</TableHead><TableHead>Stav</TableHead><TableHead>E-mail</TableHead><TableHead>Telefon</TableHead><TableHead>Vlastník</TableHead><TableHead className="w-16" /></TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const st = STATUS[c.status] ?? STATUS.active
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} color="#06b6d4" />
                        <Link href={`/crm/clients/${c.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{c.name}</Link>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{c.email || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.owner_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => setDialog({ open: true, client: c })}><Edit2 className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={() => remove(c)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {dialog.open && <ClientDialog client={dialog.client} people={people} onClose={() => setDialog({ open: false, client: null })} />}
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}

function ClientDialog({ client, people, onClose }: { client: any | null; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!client
  const [ico, setIco] = useState(client?.ico || '')
  const [name, setName] = useState(client?.name || '')
  const [dic, setDic] = useState(client?.dic || '')
  const [address, setAddress] = useState(client?.address || '')
  const [aresLoading, setAresLoading] = useState(false)

  async function fetchAres() {
    if (!ico.trim()) { toast.error('Zadejte IČO'); return }
    setAresLoading(true)
    const res = await lookupAres(ico.trim())
    setAresLoading(false)
    if (res?.error) { toast.error('ARES', res.error); return }
    if (res.data) {
      setName(res.data.name)
      if (res.data.dic) setDic(res.data.dic)
      if (res.data.address) setAddress(res.data.address)
      toast.success('Načteno z ARES')
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = isEdit ? await updateCrmClient(client.id, fd) : await createCrmClient(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(isEdit ? 'Klient uložen' : 'Klient přidán')
      onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? `Upravit: ${client.name}` : 'Nový klient'}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Název firmy"><Input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Firma s.r.o." /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="IČO">
              <div className="flex gap-1.5">
                <Input name="ico" value={ico} onChange={(e) => setIco(e.target.value)} placeholder="8 číslic" />
                <Button type="button" variant="outline" size="sm" disabled={aresLoading} onClick={fetchAres} title="Načíst z ARES">{aresLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'ARES'}</Button>
              </div>
            </Field>
            <Field label="DIČ"><Input name="dic" value={dic} onChange={(e) => setDic(e.target.value)} /></Field>
            <Field label="E-mail"><Input type="email" name="email" defaultValue={client?.email || ''} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={client?.phone || ''} /></Field>
            <Field label="Web"><Input name="website" defaultValue={client?.website || ''} placeholder="https://" /></Field>
            <Field label="Vlastník">
              <select name="ownerId" defaultValue={client?.owner_id || 'none'} className={selectClass}>
                <option value="none">—</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Stav">
              <select name="status" defaultValue={client?.status || 'active'} className={selectClass}>
                <option value="active">Aktivní</option><option value="lead">Lead</option><option value="inactive">Neaktivní</option>
              </select>
            </Field>
            <Field label="Adresa" className="sm:col-span-2"><Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          </div>
          <Field label="Poznámka"><Input name="note" defaultValue={client?.note || ''} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : isEdit ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
