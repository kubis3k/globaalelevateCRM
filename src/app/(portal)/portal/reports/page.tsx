import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart3, Paperclip } from 'lucide-react'
import { getPortalScope } from '../scope'
import { ReportDownload } from './report-download'

// Reporty od nás pro klienta. Klient vidí jen odeslané (status 'sent'), stáhne
// PDF + případné přílohy.
export default async function PortalReportsPage() {
  const { supabase, tenantId, clientId } = await getPortalScope()

  const { data: reports } = clientId
    ? await supabase
        .from('client_reports')
        .select('id, title, period_label, sent_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
    : { data: [] as any[] }
  const list = reports ?? []

  const ids = list.map((r: any) => r.id)
  const { data: atts } = ids.length
    ? await supabase.from('client_report_attachments').select('id, report_id, name, file_size').in('report_id', ids).order('created_at', { ascending: true })
    : { data: [] as any[] }
  const attByReport = new Map<string, any[]>()
  for (const a of atts ?? []) { const arr = attByReport.get(a.report_id) ?? []; arr.push(a); attByReport.set(a.report_id, arr) }

  return (
    <div className="space-y-6">
      <PageHeader title="Reporty" description="Reporty od nás — ke stažení v PDF, včetně příloh." />

      {list.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Žádné reporty"
          description={clientId ? 'Zatím vám nebyl odeslán žádný report.' : 'Váš účet zatím nemáme napojený na firmu.'}
        />
      ) : (
        <div className="space-y-3">
          {list.map((r: any) => {
            const files = attByReport.get(r.id) ?? []
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.period_label, r.sent_at ? 'odesláno ' + new Date(r.sent_at).toLocaleDateString('cs-CZ') : null].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <ReportDownload id={r.id} />
                </div>
                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    {files.map((f: any) => (
                      <a
                        key={f.id}
                        href={`/api/portal/reports/${r.id}/attachments/${f.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                      >
                        <Paperclip className="size-3.5 text-muted-foreground" />
                        {f.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
