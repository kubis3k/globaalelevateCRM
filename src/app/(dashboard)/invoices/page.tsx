import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { FilePlus, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { InvoiceForm } from './invoice-form'
import { InvoiceRowActions } from './invoice-row-actions'

type BadgeVariant = 'secondary' | 'info' | 'success' | 'destructive' | 'warning'
const STATUS: Record<string, { variant: BadgeVariant; label: string }> = {
  draft: { variant: 'secondary', label: 'Koncept' },
  pending: { variant: 'info', label: 'Čeká na úhradu' },
  paid: { variant: 'success', label: 'Uhrazeno' },
  overdue: { variant: 'destructive', label: 'Po splatnosti' },
  cancelled: { variant: 'warning', label: 'Stornováno' },
}

export default async function InvoicesPage() {
  const { supabase, tenantId } = await requireModuleAccess('invoices')
  if (!tenantId) return <NoTenantView />

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase.from('invoices').select('*').eq('tenant_id', tenantId).order('issue_date', { ascending: false }),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
  ])

  const safe = invoices || []

  return (
    <div className="space-y-6">
      <PageHeader title="Faktury" description="Správa vydaných a přijatých dokladů.">
        <Dialog>
          <DialogTrigger render={<Button size="lg" />}>
            <FilePlus className="size-4" />
            Nová faktura
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Vytvořit nový doklad</DialogTitle>
              <DialogDescription>Vyplňte údaje faktury. Doklad bude ihned zařazen do účetnictví.</DialogDescription>
            </DialogHeader>
            <InvoiceForm clients={clients ?? []} />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Přehled faktur</CardTitle>
          <CardDescription>Všechny doklady evidované ve vaší organizaci.</CardDescription>
        </CardHeader>
        <CardContent>
          {safe.length === 0 ? (
            <EmptyState icon={FileText} title="Žádné faktury" description="Zatím nebyly evidovány žádné faktury." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Číslo</TableHead>
                  <TableHead>Odběratel / Dodavatel</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Splatnost</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {safe.map((invoice) => {
                  const status = STATUS[invoice.status] ?? STATUS.draft
                  const issued = invoice.type === 'issued'
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 font-medium ${issued ? 'text-success' : 'text-destructive'}`}>
                          {issued ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                          {issued ? 'Vydaná' : 'Přijatá'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.client_name}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-foreground">
                        {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(invoice.due_date).toLocaleDateString('cs-CZ')}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-right"><InvoiceRowActions invoice={invoice} clients={clients ?? []} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
