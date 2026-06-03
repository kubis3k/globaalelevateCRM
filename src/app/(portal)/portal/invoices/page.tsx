import { PageHeader } from '@/components/ui/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText } from 'lucide-react'
import { getPortalScope } from '../scope'

const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c }).format(n)
const INV_STATUS: Record<string, { variant: 'secondary' | 'info' | 'success' | 'destructive' | 'warning'; label: string }> = {
  draft: { variant: 'secondary', label: 'Koncept' },
  pending: { variant: 'info', label: 'Čeká' },
  paid: { variant: 'success', label: 'Uhrazeno' },
  overdue: { variant: 'destructive', label: 'Po splatnosti' },
  cancelled: { variant: 'warning', label: 'Storno' },
}

export default async function PortalInvoicesPage() {
  const { supabase, tenantId, clientId } = await getPortalScope()

  const { data: invoices } = clientId
    ? await supabase.from('invoices')
        .select('invoice_number, amount, currency, status, issue_date, due_date')
        .eq('tenant_id', tenantId).eq('client_id', clientId).eq('type', 'issued')
        .order('issue_date', { ascending: false })
    : { data: [] as any[] }

  const list = invoices ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Faktury" description="Vaše vydané faktury." />
      {list.length === 0 ? (
        <EmptyState icon={FileText} title="Žádné faktury" description={clientId ? 'Zatím vám nebyla vystavena žádná faktura.' : 'K vašemu účtu zatím není přiřazen klient.'} />
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Číslo</TableHead>
                <TableHead>Vystaveno</TableHead>
                <TableHead>Splatnost</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Částka</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((i: any, idx: number) => {
                const st = INV_STATUS[i.status] ?? INV_STATUS.pending
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-foreground">{i.invoice_number}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{i.issue_date ? new Date(i.issue_date).toLocaleDateString('cs-CZ') : '—'}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString('cs-CZ') : '—'}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">{czk(Number(i.amount), i.currency)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
