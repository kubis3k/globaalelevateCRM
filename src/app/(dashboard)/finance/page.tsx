import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PlusCircle, TrendingDown, TrendingUp, DollarSign, Receipt } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddTransactionForm } from './add-transaction-form'
import { deleteTransaction } from './actions'
import { DeleteButton } from '@/components/delete-button'
import { CashflowChart } from './cashflow-chart'

const czk = (n: number, currency = 'CZK') =>
  new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(n)

export default async function FinancePage() {
  const { supabase, tenantId } = await requireModuleAccess('finance')
  if (!tenantId) return <NoTenantView />

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const safe = transactions || []
  const invoiceIds = Array.from(new Set(safe.map((t: any) => t.invoice_id).filter(Boolean)))
  const { data: linkedInvoices } = invoiceIds.length
    ? await supabase.from('invoices').select('id, invoice_number').in('id', invoiceIds as string[])
    : { data: [] as any[] }
  const invNum = (id: string) => (linkedInvoices ?? []).find((i: any) => i.id === id)?.invoice_number

  const totalIncome = safe.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
  const totalExpense = safe.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
  const balance = totalIncome - totalExpense
  const chartData = [...safe].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" description="Sledujte cash-flow a spravujte transakce v reálném čase.">
        <Dialog>
          <DialogTrigger render={<Button size="lg" />}>
            <PlusCircle className="size-4" />
            Nová transakce
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přidat transakci</DialogTitle>
              <DialogDescription>Zadejte příjem nebo výdaj do podnikového cash-flow.</DialogDescription>
            </DialogHeader>
            <AddTransactionForm />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Celkový zůstatek" value={czk(balance)} tone={balance >= 0 ? 'neutral' : 'negative'} icon={<DollarSign className="size-4" />} />
        <StatCard title="Příjmy" value={czk(totalIncome)} tone="positive" icon={<TrendingUp className="size-4" />} />
        <StatCard title="Výdaje" value={czk(totalExpense)} tone="negative" icon={<TrendingDown className="size-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vývoj cash-flow</CardTitle>
          <CardDescription>Kumulativní zůstatek v čase</CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nedávné transakce</CardTitle>
        </CardHeader>
        <CardContent>
          {safe.length === 0 ? (
            <EmptyState icon={Receipt} title="Žádné transakce" description="Zatím nebyly evidovány žádné transakce." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {safe.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant={t.type === 'income' ? 'success' : 'destructive'}>
                        {t.type === 'income' ? 'Příjem' : 'Výdaj'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {t.description}
                        {t.invoice_id && <Badge variant="info" className="h-4 px-1.5 text-[10px]">z faktury {invNum(t.invoice_id)}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(t.date).toLocaleDateString('cs-CZ')}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {t.type === 'income' ? '+' : '−'}{czk(Number(t.amount), t.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteTransaction.bind(null, t.id)}
                        title="Smazat transakci?"
                        description="Tato akce je nevratná."
                        successMessage="Transakce smazána"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
