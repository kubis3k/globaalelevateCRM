'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Receipt, Check, X, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createTransaction, updateTransaction, deleteTransaction, createCategory, importTransactions } from './actions'

type Tx = { id: string; type: string; amount: number; currency: string; date: string; description: string | null; invoice_id: string | null; category_id: string | null }
type Cat = { id: string; name: string }

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const czk = (n: number, currency = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(n)

type ParsedRow = { date: string; amount: number; type: string; description: string | null }
function normDate(s: string): string | null {
  const t = s.trim()
  let m = t.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? t : null
}
function normAmount(s: string): number | null {
  let t = s.replace(/\s/g, '').replace(/[^\d,.-]/g, '')
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.')
  else t = t.replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
function parseCsv(text: string): ParsedRow[] {
  const out: ParsedRow[] = []
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(/[;\t]/).map((p) => p.trim())
    if (parts.length < 2) continue
    const date = normDate(parts[0])
    const amount = normAmount(parts[1])
    if (!date || amount === null || amount === 0) continue
    out.push({ date, amount: Math.abs(amount), type: amount < 0 ? 'expense' : 'income', description: parts.slice(2).join(' ').trim() || null })
  }
  return out
}

export function TransactionsManager({ transactions, categories: initialCats, invNumbers }: { transactions: Tx[]; categories: Cat[]; invNumbers: Record<string, string> }) {
  const router = useRouter()
  const [categories, setCategories] = useState<Cat[]>(initialCats)
  const [dialog, setDialog] = useState<{ tx?: Tx } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [isPending, start] = useTransition()

  const groups = useMemo(() => {
    const m = new Map<string, Tx[]>()
    for (const t of transactions) { const k = t.category_id || '__none'; if (!m.has(k)) m.set(k, []); m.get(k)!.push(t) }
    const ordered = [...categories]
      .filter((c) => m.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
      .map((c) => ({ id: c.id, name: c.name, items: m.get(c.id)! }))
    if (m.has('__none')) ordered.push({ id: '__none', name: 'Bez kategorie', items: m.get('__none')! })
    return ordered
  }, [transactions, categories])

  async function addCategory(name: string): Promise<string | null> {
    const r = await createCategory(name)
    if (r.error || !r.id) { toast.error('Chyba', r.error || 'Nepodařilo se vytvořit kategorii.'); return null }
    const id = r.id
    setCategories((prev) => (prev.some((c) => c.id === id) ? prev : [...prev, { id, name: name.trim() }]))
    return id
  }

  async function remove(t: Tx) {
    const ok = await confirmDialog({ title: 'Smazat transakci?', description: 'Tato akce je nevratná.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => {
      const r = await deleteTransaction(t.id)
      if (r?.error) toast.error('Chyba', r.error); else { toast.success('Transakce smazána'); router.refresh() }
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Transakce</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => setShowImport(true)}><Upload className="size-4" />Import CSV</Button>
          <Button size="lg" onClick={() => setDialog({})}><Plus className="size-4" />Nová transakce</Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="Žádné transakce" description="Zatím nebyly evidovány žádné transakce." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Popis</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Částka</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => {
                const net = g.items.reduce((a, t) => a + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
                return (
                  <Fragment key={g.id}>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="bg-muted/40 py-1.5">
                        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <span>{g.name} · {g.items.length}</span>
                          <span className={cn('tabular-nums', net >= 0 ? 'text-success' : 'text-destructive')}>{net >= 0 ? '+' : '−'}{czk(Math.abs(net))}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                    {g.items.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell><Badge variant={t.type === 'income' ? 'success' : 'destructive'}>{t.type === 'income' ? 'Příjem' : 'Výdaj'}</Badge></TableCell>
                        <TableCell className="font-medium text-foreground">
                          <span className="inline-flex items-center gap-2">
                            {t.description || '—'}
                            {t.invoice_id && invNumbers[t.invoice_id] && <Badge variant="info" className="h-4 px-1.5 text-[10px]">z faktury {invNumbers[t.invoice_id]}</Badge>}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(t.date).toLocaleDateString('cs-CZ')}</TableCell>
                        <TableCell className={cn('text-right font-semibold tabular-nums', t.type === 'income' ? 'text-success' : 'text-destructive')}>
                          {t.type === 'income' ? '+' : '−'}{czk(Number(t.amount), t.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => setDialog({ tx: t })}><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon-sm" aria-label="Smazat" disabled={isPending} className="text-muted-foreground hover:text-destructive" onClick={() => remove(t)}><Trash2 className="size-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {dialog && (
        <TransactionDialog
          tx={dialog.tx}
          categories={categories}
          onAddCategory={addCategory}
          onSaved={() => router.refresh()}
          onClose={() => setDialog(null)}
        />
      )}

      {showImport && <ImportDialog onClose={() => setShowImport(false)} onDone={() => router.refresh()} />}
    </Card>
  )
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [pending, start] = useTransition()
  const rows = useMemo(() => parseCsv(text), [text])
  const income = rows.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0)
  const expense = rows.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0)

  function run() {
    if (!rows.length) { toast.error('Chyba', 'Žádné platné řádky.'); return }
    start(async () => {
      const res = await importTransactions(rows)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(`Importováno ${res.count} transakcí`); onClose(); onDone()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import výpisu (CSV)</DialogTitle>
          <DialogDescription>Řádky ve formátu: datum ; částka ; popis. Záporná částka = výdaj. Oddělovač „;" nebo tabulátor.</DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={'01.05.2026;-1250,50;Nákup materiálu\n03.05.2026;48000;Platba faktury 2026-014'}
          className="w-full rounded-lg border border-input bg-background p-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Rozpoznáno řádků</span><span className="font-medium tabular-nums text-foreground">{rows.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Příjmy / výdaje</span><span className="tabular-nums"><span className="text-success">+{czk(income)}</span> · <span className="text-destructive">−{czk(expense)}</span></span></div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border">
                  {rows.slice(0, 12).map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 whitespace-nowrap text-muted-foreground">{new Date(r.date).toLocaleDateString('cs-CZ')}</td>
                      <td className="px-2 py-1">{r.description || '—'}</td>
                      <td className={cn('px-2 py-1 text-right tabular-nums', r.type === 'income' ? 'text-success' : 'text-destructive')}>{r.type === 'income' ? '+' : '−'}{czk(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 12 && <div className="px-2 py-1 text-center text-[11px] text-muted-foreground">… a dalších {rows.length - 12}</div>}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
          <Button type="button" size="lg" disabled={pending || !rows.length} onClick={run}>{pending ? 'Importuji…' : `Importovat ${rows.length || ''}`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TransactionDialog({ tx, categories, onAddCategory, onSaved, onClose }: {
  tx?: Tx; categories: Cat[]; onAddCategory: (name: string) => Promise<string | null>; onSaved: () => void; onClose: () => void
}) {
  const [type, setType] = useState(tx?.type || 'expense')
  const [description, setDescription] = useState(tx?.description || '')
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '')
  const [currency, setCurrency] = useState(tx?.currency || 'CZK')
  const [date, setDate] = useState(tx?.date || new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState(tx?.category_id || 'none')
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [pending, start] = useTransition()

  async function confirmNewCat() {
    const name = newCat.trim()
    if (!name) { setAdding(false); return }
    const id = await onAddCategory(name)
    if (id) setCategoryId(id)
    setAdding(false); setNewCat('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !date) { toast.error('Chyba', 'Vyplňte částku a datum.'); return }
    const fd = new FormData()
    fd.set('type', type); fd.set('description', description); fd.set('amount', amount)
    fd.set('currency', currency); fd.set('date', date); fd.set('categoryId', categoryId)
    start(async () => {
      const res = tx ? await updateTransaction(tx.id, fd) : await createTransaction(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(tx ? 'Transakce upravena' : 'Transakce uložena')
      onClose(); onSaved()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tx ? 'Upravit transakci' : 'Nová transakce'}</DialogTitle>
          <DialogDescription>Příjem nebo výdaj v cash-flow firmy.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Typ</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
                <option value="income">Příjem</option>
                <option value="expense">Výdaj</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Popis / účel</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Např. Nákup vybavení" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Částka</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Měna</Label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectClass}>
                <option value="CZK">CZK</option><option value="EUR">EUR</option><option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            {adding ? (
              <div className="flex items-center gap-2">
                <Input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Název nové kategorie"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCat() } if (e.key === 'Escape') { setAdding(false); setNewCat('') } }} />
                <Button type="button" variant="outline" size="icon" aria-label="Přidat" onClick={confirmNewCat}><Check className="size-4" /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Zrušit" onClick={() => { setAdding(false); setNewCat('') }}><X className="size-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
                  <option value="none">— bez kategorie —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="size-4" />Nová</Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
