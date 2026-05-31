'use client'

import { useState, useTransition } from 'react'
import { Plus, Pin, PinOff, Pencil, Trash2, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { saveNote, togglePinNote, deleteNote } from '../actions'

type Note = { id: string; title: string | null; content: string; pinned: boolean; updated_at: string }

export function NotesClient({ notes }: { notes: Note[] }) {
  const [editing, setEditing] = useState<Note | null>(null)
  const [creating, setCreating] = useState(false)
  const [isPending, startTransition] = useTransition()

  function pin(n: Note) {
    startTransition(async () => {
      const res = await togglePinNote(n.id, !n.pinned)
      if (res?.error) toast.error('Chyba', res.error)
    })
  }
  async function remove(n: Note) {
    const ok = await confirmDialog({ title: 'Smazat poznámku?', description: 'Poznámka bude trvale odstraněna.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteNote(n.id)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Smazáno')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? 'poznámka' : notes.length >= 2 && notes.length <= 4 ? 'poznámky' : 'poznámek'}</p>
        <Button size="lg" onClick={() => setCreating(true)}><Plus className="size-4" />Nová poznámka</Button>
      </div>

      {notes.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <EmptyState icon={StickyNote} title="Žádné poznámky" description="Vytvoř si soukromou poznámku — vidíš ji jen ty." />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <div key={n.id} className={cn('group flex flex-col rounded-xl border bg-card p-3.5 shadow-xs transition-colors', n.pinned ? 'border-primary/40' : 'border-border')}>
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 truncate font-medium text-foreground">{n.title || '(bez názvu)'}</h3>
                <button onClick={() => pin(n)} disabled={isPending} title={n.pinned ? 'Odepnout' : 'Připnout'} className={cn('shrink-0 rounded p-1', n.pinned ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground')}>
                  {n.pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                </button>
              </div>
              <p className="mb-3 line-clamp-5 flex-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.content || '—'}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] tabular-nums text-muted-foreground">{new Date(n.updated_at).toLocaleDateString('cs-CZ')}</span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => setEditing(n)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" onClick={() => remove(n)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && <NoteDialog note={editing} onClose={() => { setCreating(false); setEditing(null) }} />}
    </div>
  )
}

function NoteDialog({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (note) fd.set('id', note.id)
    startTransition(async () => {
      const res = await saveNote(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(note ? 'Uloženo' : 'Poznámka vytvořena')
      onClose()
    })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? 'Upravit poznámku' : 'Nová poznámka'}</DialogTitle>
          <DialogDescription>Soukromá poznámka — vidíš ji jen ty.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Název</Label><Input name="title" defaultValue={note?.title || ''} placeholder="Název poznámky" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Obsah</Label>
            <textarea name="content" defaultValue={note?.content || ''} rows={8} placeholder="Napiš si cokoliv…"
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="pinned" defaultChecked={note?.pinned} className="size-4 rounded border-input" />
            Připnout nahoru
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
