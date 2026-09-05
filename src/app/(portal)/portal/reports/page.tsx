import { PageHeader } from '@/components/ui/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart3 } from 'lucide-react'
import { getPortalScope } from '../scope'
import { ReportDownload } from './report-download'

// Reporty od nás pro klienta (marketing / weby / akce). Klient vidí jen odeslané
// (status 'sent') a stáhne je jako PDF.
export default async function PortalReportsPage() {
  const { supabase, tenantId, clientId } = await getPortalScope()

  const { data } = clientId
    ? await supabase
        .from('client_reports')
        .select('id, title, period_label, sent_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
    : { data: [] as any[] }
  const list = data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Reporty" description="Reporty od nás — ke stažení v PDF." />

      {list.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Žádné reporty"
          description={clientId ? 'Zatím vám nebyl odeslán žádný report.' : 'Váš účet zatím nemáme napojený na firmu.'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Období</TableHead>
                <TableHead>Odesláno</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.period_label ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{r.sent_at ? new Date(r.sent_at).toLocaleDateString('cs-CZ') : '—'}</TableCell>
                  <TableCell className="text-right"><ReportDownload id={r.id} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
