import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Activity, LayoutDashboard, Users, FileText, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Odstraníme interní doménu z emailu pro zobrazení
  const username = user.email?.split('@')[0] || 'Uživatel'

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Global Elevate</span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem href="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />} label="Dashboard" />
          <NavItem href="/team" icon={<Users className="h-5 w-5" />} label="Tým a oprávnění" />
          <NavItem href="/invoices" icon={<FileText className="h-5 w-5" />} label="Faktury" />
          <NavItem href="/finance" icon={<DollarSign className="h-5 w-5" />} label="Live Finance" />
          <NavItem href="/calendar" icon={<Calendar className="h-5 w-5" />} label="Kalendář" />
        </nav>

        <div className="mt-auto border-t border-zinc-200 pt-4 dark:border-zinc-800 px-2">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">{username}</div>
          <div className="text-xs text-zinc-500">Aktivní session</div>
          <form action="/auth/signout" method="post" className="mt-4">
            <button className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors">Odhlásit se</button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-200 bg-white flex items-center px-8 dark:border-zinc-800 dark:bg-zinc-950 shrink-0">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Přehled</h1>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 transition-colors">
      {icon}
      {label}
    </Link>
  )
}
