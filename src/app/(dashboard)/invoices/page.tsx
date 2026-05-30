import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilePlus, MoreHorizontal, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AddInvoiceForm } from './add-invoice-form'
import { deleteInvoice, updateInvoiceStatus } from './actions'

export default async function InvoicesPage() {
  const { supabase, tenantId } = await requireModuleAccess('invoices')
  
  if (!tenantId) {
    return <NoTenantView />
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('issue_date', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Faktury</h2>
          <p className="text-zinc-500">Správa vydaných a přijatých dokladů.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              <FilePlus className="mr-2 h-4 w-4" />
              Nová faktura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Vytvořit nový doklad</DialogTitle>
              <DialogDescription>
                Vyplňte údaje faktury. Doklad bude ihned zařazen do účetnictví.
              </DialogDescription>
            </DialogHeader>
            <AddInvoiceForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Přehled faktur</CardTitle>
          <CardDescription>Všechny doklady evidované ve vaší organizaci.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Číslo</TableHead>
                  <TableHead>Odběratel / Dodavatel</TableHead>
                  <TableHead>Částka</TableHead>
                  <TableHead>Splatnost</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {invoice.type === 'issued' 
                        ? <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium"><ArrowUpRight className="mr-1 h-4 w-4"/> Vydaná</div>
                        : <div className="flex items-center text-rose-600 dark:text-rose-400 font-medium"><ArrowDownLeft className="mr-1 h-4 w-4"/> Přijatá</div>
                      }
                    </TableCell>
                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: invoice.currency }).format(invoice.amount)}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {new Date(invoice.due_date).toLocaleDateString('cs-CZ')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Otevřít menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Změnit stav</DropdownMenuLabel>
                          <form action={updateInvoiceStatus.bind(null, invoice.id, 'paid')}>
                            <button type="submit" className="w-full text-left px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Uhrazeno</button>
                          </form>
                          <form action={updateInvoiceStatus.bind(null, invoice.id, 'overdue')}>
                            <button type="submit" className="w-full text-left px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Po splatnosti</button>
                          </form>
                          <form action={deleteInvoice.bind(null, invoice.id)}>
                            <button type="submit" className="w-full text-left px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium transition-colors">Odstranit doklad</button>
                          </form>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!invoices || invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                      Zatím nebyly evidovány žádné faktury.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    pending: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  }
  
  const labels: Record<string, string> = {
    draft: "Koncept",
    pending: "Čeká na úhradu",
    paid: "Uhrazeno",
    overdue: "Po splatnosti",
    cancelled: "Stornováno",
  }

  return (
    <Badge className={styles[status] || styles.draft} variant="secondary">
      {labels[status] || status}
    </Badge>
  )
}
