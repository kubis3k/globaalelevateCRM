import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Trash, TrendingDown, TrendingUp, DollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddTransactionForm } from './add-transaction-form'
import { deleteTransaction } from './actions'
import { CashflowChart } from './cashflow-chart'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: currentUserData } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .single()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('tenant_id', currentUserData?.tenant_id)
    .order('date', { ascending: false })

  const totalIncome = transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0) || 0
  const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0) || 0
  const balance = totalIncome - totalExpense

  // Sestavení dat pro graf (vzestupně podle data)
  const chartData = [...(transactions || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Finance</h2>
          <p className="text-zinc-500">Sledujte cash-flow a spravujte transakce v reálném čase.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nová transakce
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Přidat transakci</DialogTitle>
              <DialogDescription>
                Zadejte příjmy nebo výdaje do podnikového cash-flow.
              </DialogDescription>
            </DialogHeader>
            <AddTransactionForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard 
          title="Celkový zůstatek" 
          value={balance} 
          icon={<DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />} 
          className={balance >= 0 ? "text-zinc-900 dark:text-zinc-50" : "text-red-600 dark:text-red-400"}
        />
        <StatCard 
          title="Příjmy" 
          value={totalIncome} 
          icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} 
          className="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard 
          title="Výdaje" 
          value={totalExpense} 
          icon={<TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />} 
          className="text-rose-600 dark:text-rose-400"
        />
      </div>

      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Vývoj Cash-flow</CardTitle>
          <CardDescription>Graf vývoje zůstatku v čase (fialová = kumulativní zůstatek).</CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart data={chartData} />
        </CardContent>
      </Card>

      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Nedávné transakce</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.type === 'income' 
                        ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Příjem</Badge>
                        : <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Výdaj</Badge>
                      }
                    </TableCell>
                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">{t.description}</TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {new Date(t.date).toLocaleDateString('cs-CZ')}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {t.type === 'income' ? '+' : '-'}
                      {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: t.currency }).format(t.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deleteTransaction.bind(null, t.id)}>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
                {!transactions || transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                      Zatím nebyly evidovány žádné transakce.
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

function StatCard({ title, value, icon, className }: { title: string, value: number, icon: React.ReactNode, className?: string }) {
  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</CardTitle>
        <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tracking-tight ${className || ''}`}>
          {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(value)}
        </div>
      </CardContent>
    </Card>
  )
}
