import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { FolderOpen, FileText } from 'lucide-react'
import { getPortalScope } from '../scope'
import { DocDownload } from './doc-download'

export default async function PortalDocumentsPage() {
  const { supabase, user } = await getPortalScope()

  const { data: links } = await supabase.from('portal_document_access').select('document_id').eq('user_id', user.id)
  const ids = (links ?? []).map((l: any) => l.document_id)
  const { data: docs } = ids.length
    ? await supabase.from('documents').select('id, name, category, created_at').in('id', ids).order('created_at', { ascending: false })
    : { data: [] as any[] }

  const list = docs ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Dokumenty" description="Dokumenty sdílené s vámi." />
      {list.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Žádné dokumenty" description="Zatím s vámi nebyly sdíleny žádné dokumenty." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d: any) => (
            <div key={d.id} className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground" title={d.name}>{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.category}{d.created_at ? ` · ${new Date(d.created_at).toLocaleDateString('cs-CZ')}` : ''}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end"><DocDownload id={d.id} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
