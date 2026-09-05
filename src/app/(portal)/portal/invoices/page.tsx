import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText, ArrowUpRight, ArrowDownLeft, Wallet, Unplug } from 'lucide-react'
import { getPortalScope } from '../scope'
import { getUctoInvoicesForClient } from '@/lib/ucto'
import { InvoiceDownload } from './invoice-download'

const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)

// Vydané faktury se čtou z účetního systému (ucto), spárované na klienta
// podle IČO / názvu firmy — work už si vlastní evidenci faktur nevede.
export default async function PortalInvoicesPage() {
  const { supabase, tenantId, clientId } = await getPortalScope()

  const { data: client } = clientId
    ? await supabase.from('crm_clients').select('name, ico').eq('tenant_id', tenantId).eq('id', clientId).maybeSingle()
    : { data: null as any }

  const invoices = client ? await getUctoInvoicesForClient(client) : []
  const list = invoices ?? []
  const today = new Date().toISOString().slice(0, 10)

  const total = list.reduce((a, i) => a + i.amount, 0)
  const paid = list.filter((i) => i.paid).reduce((a, i) => a + i.amount, 0)
  const unpaid = list.filter((i) => !i.paid).reduce((a, i) => a + i.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Faktury" description="Vaše vydané faktury a jejich stav." />

      {invoices === null ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <Unplug className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <div className="font-medium text-foreground">Účetnictví není dostupné</div>
            <div className="text-muted-foreground">Zkuste to prosím později.</div>
          </div>
        </div>
      ) : (
        <>
          {list.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Celkem" value={czk(total)} icon={<Wallet className="size-4" />} />
              <StatCard title="Uhrazeno" value={czk(paid)} tone="positive" icon={<ArrowUpRight className="size-4" />} />
              <StatCard title="Neuhrazeno" value={czk(unpaid)} tone={unpaid > 0 ? 'negative' : 'neutral'} icon={<ArrowDownLeft className="size-4" />} />
            </div>
          )}

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
                    <TableHead className="text-right">Doklad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((i) => {
                    const overdue = !i.paid && i.dueDate && i.dueDate < today
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium text-foreground">{i.number}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{new Date(i.issueDate).toLocaleDateString('cs-CZ')}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{i.dueDate ? new Date(i.dueDate).toLocaleDateString('cs-CZ') : '—'}</TableCell>
                        <TableCell>
                          {i.paid
                            ? <Badge variant="success">Uhrazeno</Badge>
                            : overdue
                              ? <Badge variant="destructive">Po splatnosti</Badge>
                              : <Badge variant="info">Čeká</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-foreground">{czk(i.amount, i.currency)}</TableCell>
                        <TableCell className="text-right"><InvoiceDownload id={i.id} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
