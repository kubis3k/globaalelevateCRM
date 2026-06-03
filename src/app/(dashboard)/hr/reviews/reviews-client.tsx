'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Star, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveReview, deleteReview } from '../actions'

const ta = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('cs-CZ') : '—'
type Person = { user_id: string; name: string }

export function HrReviewsClient({ reviews, people, canManage }: { reviews: any[]; people: Person[]; canManage: boolean }) {
  const [dialog, setDialog] = useState<{ open: boolean; r: any | null }>({ open: false, r: null })
  const [pending, startTransition] = useTransition()

  function remove(r: any) {
    confirmDialog({ title: 'Smazat hodnocení?', description: `${r.employee} · ${fmt(r.review_date)}`, confirmLabel: 'Smazat', destructive: true }).then((ok) => {
      if (!ok) return
      startTransition(async () => { const res = await deleteReview(r.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Smazáno') })
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{reviews.length} záznamů · hodnocení a 1:1</p>
        {canManage && <Button size="lg" onClick={() => setDialog({ open: true, r: null })}><Plus className="size-4" />Nové hodnocení</Button>}
      </div>
      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Žádná hodnocení" description={canManage ? 'Zaznamenej hodnocení nebo 1:1 se zaměstnancem.' : 'Zatím nemáš žádné hodnocení.'} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-foreground">{r.employee}</div>
                  <div className="text-xs text-muted-foreground">{r.type === 'one_on_one' ? '1:1' : 'Hodnocení'} · {fmt(r.review_date)}{r.reviewer ? ` · ${r.reviewer}` : ''}</div>
                </div>
                <div className="flex items-center gap-1">
                  {r.rating ? <span className="flex items-center gap-0.5 text-amber-500">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('size-3.5', i < r.rating ? 'fill-current' : 'opacity-25')} />)}</span> : null}
                  {canManage && <><Button variant="ghost" size="icon-sm" onClick={() => setDialog({ open: true, r })}><Edit2 className="size-3.5" /></Button><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => remove(r)}><Trash2 className="size-3.5" /></Button></>}
                </div>
              </div>
              {r.strengths && <p className="text-sm text-foreground"><span className="text-muted-foreground">Silné stránky: </span>{r.strengths}</p>}
              {r.improvements && <p className="text-sm text-foreground"><span className="text-muted-foreground">Ke zlepšení: </span>{r.improvements}</p>}
              {r.next_steps && <p className="text-sm text-foreground"><span className="text-muted-foreground">Další kroky: </span>{r.next_steps}</p>}
            </div>
          ))}
        </div>
      )}
      {dialog.open && canManage && <ReviewDialog r={dialog.r} people={people} onClose={() => setDialog({ open: false, r: null })} />}
    </div>
  )
}

function ReviewDialog({ r, people, onClose }: { r: any | null; people: Person[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!r
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { const res = await saveReview(fd); if (res?.error) toast.error('Chyba', res.error); else { toast.success('Uloženo'); onClose() } })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Upravit hodnocení' : 'Nové hodnocení / 1:1'}</DialogTitle><DialogDescription>Zaznamenej výkon, posun a další kroky.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {isEdit && <input type="hidden" name="id" value={r.id} />}
          <div className="grid grid-cols-2 gap-3">
            {!isEdit && <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Zaměstnanec</Label><select name="userId" required defaultValue="" className={selectClass}><option value="" disabled>— vyber —</option>{people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select></div>}
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Typ</Label><select name="type" defaultValue={r?.type || 'review'} className={selectClass}><option value="review">Hodnocení</option><option value="one_on_one">1:1</option></select></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Datum</Label><Input type="date" name="reviewDate" defaultValue={r?.review_date || new Date().toISOString().slice(0, 10)} /></div>
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Hodnocení (1–5)</Label><select name="rating" defaultValue={r?.rating || ''} className={selectClass}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Silné stránky</Label><textarea name="strengths" rows={2} defaultValue={r?.strengths || ''} className={ta} /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Ke zlepšení</Label><textarea name="improvements" rows={2} defaultValue={r?.improvements || ''} className={ta} /></div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Další kroky / cíle</Label><textarea name="nextSteps" rows={2} defaultValue={r?.next_steps || ''} className={ta} /></div>
          <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onClose}>Zrušit</Button><Button type="submit" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
