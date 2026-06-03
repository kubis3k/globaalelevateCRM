'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { createArticle, updateArticle, deleteArticle } from './actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const textareaClass = 'w-full rounded-lg border border-input bg-background p-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
export const SOP_CATEGORY: Record<string, string> = { open: 'Otevření', close: 'Zavření', emergency: 'Nouzové postupy', bar: 'Bar / recepty', other: 'Ostatní' }

export function OpsWikiClient({ articles }: { articles: any[] }) {
  const [dialog, setDialog] = useState<{ item: any | null } | null>(null)
  const [isPending, start] = useTransition()

  async function remove(a: any) {
    const ok = await confirmDialog({ title: `Smazat „${a.title}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    start(async () => { const r = await deleteArticle(a.id); if (r?.error) toast.error('Chyba', r.error); else toast.success('Smazáno') })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{articles.length} postupů</p>
        <Button size="lg" onClick={() => setDialog({ item: null })}><Plus className="size-4" />Nový postup</Button>
      </div>

      {articles.length === 0 ? (
        <EmptyState icon={BookOpen} title="Žádné postupy" description="Sepiš provozní postupy — otevření/zavření klubu, nouzové postupy, barové recepty." />
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <details key={a.id} className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 p-3">
                <Badge variant="secondary" className="h-5 shrink-0">{SOP_CATEGORY[a.category] ?? a.category}</Badge>
                <span className="flex-1 truncate text-sm font-medium text-foreground">{a.title}</span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-xs" aria-label="Upravit" disabled={isPending} onClick={(e) => { e.preventDefault(); setDialog({ item: a }) }}><Pencil className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-xs" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={isPending} onClick={(e) => { e.preventDefault(); remove(a) }}><Trash2 className="size-3.5" /></Button>
                </span>
              </summary>
              {a.body && <div className="whitespace-pre-wrap border-t border-border p-3 text-sm text-foreground/90">{a.body}</div>}
            </details>
          ))}
        </div>
      )}

      {dialog && <ArticleDialog item={dialog.item} onClose={() => setDialog(null)} />}
    </div>
  )
}

function ArticleDialog({ item, onClose }: { item: any | null; onClose: () => void }) {
  const [pending, start] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const r = item ? await updateArticle(item.id, fd) : await createArticle(fd)
      if (r?.error) { toast.error('Chyba', r.error); return }
      toast.success(item ? 'Uloženo' : 'Přidáno'); onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{item ? 'Upravit postup' : 'Nový postup'}</DialogTitle><DialogDescription>SOP / provozní postup nebo recept.</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" required defaultValue={item?.title ?? ''} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kategorie</Label>
              <select name="category" defaultValue={item?.category ?? 'other'} className={selectClass}>{Object.entries(SOP_CATEGORY).map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Obsah</Label><textarea name="body" rows={10} defaultValue={item?.body ?? ''} className={textareaClass} placeholder="Postup krok za krokem…" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : item ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
