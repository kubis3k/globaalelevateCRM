import { requireModuleAccess } from '@/lib/supabase/tenant'
import { getUctoInvoices } from '@/lib/ucto'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowDownLeft, ArrowUpRight, ExternalLink, FileText, Unplug } from 'lucide-react'

const czk = (n: number, currency = 'CZK') =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('cs-CZ') : '—')

// Faktury = read-only zrcadlo účetního systému. Doklady se vystavují a párují
// v účtu (ucto.globaalelevate.com); tady je jen přehled se stavem úhrady.
export default async function InvoicesPage() {
  const { tenantId } = await requireModuleAccess('invoices')
  if (!tenantId) return <NoTenantView />

  const invoices = await getUctoInvoices()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Faktury" description="Vydané a přijaté doklady z účetního systému." />
        <a
          href="https://ucto.globaalelevate.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          Vystavit / spravovat v účetnictví
        </a>
      </div>

      {invoices === null ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <Unplug className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <div className="font-medium text-foreground">Účetnictví není připojeno</div>
            <div className="text-muted-foreground">Zkontroluj UCTO_DATABASE_URL v env proměnných na Vercelu.</div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {invoices.length === 0 ? (
            <EmptyState icon={FileText} title="Žádné doklady" description="V účetnictví zatím nejsou žádné faktury." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Číslo</TableHead>
                  <TableHead>Protistrana</TableHead>
                  <TableHead className="hidden lg:table-cell">Popis</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="hidden sm:table-cell">Splatnost</TableHead>
                  <TableHead>Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const issued = inv.docType === 'faktura_vydana'
                  const overdue = !inv.paid && inv.dueDate && inv.dueDate < today
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${issued ? 'text-success' : 'text-destructive'}`}>
                          {issued ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
                          {issued ? 'Vydaná' : 'Přijatá'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{inv.number}{inv.variableSymbol && inv.variableSymbol !== inv.number ? <span className="ml-1 text-xs text-muted-foreground">VS {inv.variableSymbol}</span> : null}</TableCell>
                      <TableCell className="text-foreground">{inv.contactName || '—'}</TableCell>
                      <TableCell className="hidden max-w-72 truncate lg:table-cell text-muted-foreground">{inv.description}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-foreground">{czk(inv.amount, inv.currency)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
                      <TableCell>
                        {inv.paid
                          ? <Badge variant="success">Uhrazeno</Badge>
                          : overdue
                            ? <Badge variant="destructive">Po splatnosti</Badge>
                            : <Badge variant="warning">Čeká na úhradu</Badge>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}
