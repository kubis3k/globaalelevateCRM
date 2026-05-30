import { requireTenant } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DollarSign, FileText, Users, Calendar } from 'lucide-react'
import { CashflowChart } from '../finance/cashflow-chart'

export default async function DashboardPage() {
  const { supabase, tenantId } = await requireTenant()
  
  if (!tenantId) {
    return <NoTenantView />
  }

  // Data fetching safely
  const [
    teamResult,
    invoicesResult,
    upcomingTasksResult,
    transactionsResult
  ] = await Promise.all([
    supabase.from('tenant_users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('invoices').select('amount, status, type').eq('tenant_id', tenantId),
    supabase.from('calendar_events').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('start_time', new Date().toISOString()),
    supabase.from('transactions').select('amount, type, date').eq('tenant_id', tenantId).order('date', { ascending: true })
  ])

  const teamCount = teamResult.count || 0
  const invoices = invoicesResult.data || []
  const upcomingTasks = upcomingTasksResult.count || 0
  const transactions = transactionsResult.data || []

  // Invoices processing
  const unpaidInvoices = invoices.filter((i: any) => i.status === 'pending' || i.status === 'overdue').length

  // Finance processing
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Zůstatek Cash-flow" value={`${new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(balance)}`} description="Dle aktuálních transakcí" icon={<DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />} />
        <StatCard title="Nezaplacené faktury" value={unpaidInvoices.toString()} description={unpaidInvoices === 0 ? "Vše uhrazeno" : "Vyžaduje vaši pozornost"} icon={<FileText className={unpaidInvoices > 0 ? "h-4 w-4 text-rose-600 dark:text-rose-400" : "h-4 w-4 text-emerald-600 dark:text-emerald-400"} />} />
        <StatCard title="Aktivní zaměstnanci" value={(teamCount || 0).toString()} description="Správa týmu" icon={<Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />} />
        <StatCard title="Nadcházející úkoly" value={(upcomingTasks || 0).toString()} description="V kalendáři" icon={<Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Cash Flow přehled</CardTitle>
          </CardHeader>
          <CardContent>
            <CashflowChart data={transactions || []} />
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm border-zinc-200 dark:border-zinc-800 flex flex-col">
          <CardHeader>
            <CardTitle>Poslední transakce</CardTitle>
            <CardDescription>Nejnovější pohyby na účtu</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {transactions?.slice(-5).reverse().map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.type === 'income' ? 'Příjem' : 'Výdaj'}</span>
                    <span className="text-xs text-zinc-500">{new Date(t.date).toLocaleDateString('cs-CZ')}</span>
                  </div>
                  <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(t.amount)}
                  </span>
                </div>
              ))}
              {!transactions || transactions.length === 0 && (
                <div className="text-sm text-zinc-500 text-center py-4">Zatím žádné transakce</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, description, icon }: { title: string, value: string, description: string, icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</CardTitle>
        <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</div>
        <p className="text-xs text-zinc-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}
