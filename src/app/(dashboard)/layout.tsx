import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Users, FileText, DollarSign, Calendar, LogOut, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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

  const username = user.email?.split('@')[0] || 'Uživatel'
  const initials = username.split('.').map((p: string) => p[0]?.toUpperCase()).join('').slice(0, 2)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 bg-white dark:bg-[#0d1117] border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0 transition-colors duration-300">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100 dark:border-white/5">
          <Image
            src="/logo.png"
            alt="Globaal Elevate"
            width={130}
            height={40}
            className="logo-smart object-contain"
            priority
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-3 mb-3">
            Menu
          </p>
          <NavItem href="/dashboard"  icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <NavItem href="/team"       icon={<Users className="h-4 w-4" />}           label="Tým" />
          <NavItem href="/invoices"   icon={<FileText className="h-4 w-4" />}        label="Faktury" />
          <NavItem href="/finance"    icon={<DollarSign className="h-4 w-4" />}      label="Finance" />
          <NavItem href="/calendar"   icon={<Calendar className="h-4 w-4" />}        label="Kalendář" />
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate">{username}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-600">Admin</div>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-slate-400 hover:text-red-600 dark:text-slate-600 dark:hover:text-red-400 transition-colors" title="Odhlásit se">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-6 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Globaal Elevate</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Production</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-150 group"
    >
      <span className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{icon}</span>
      {label}
    </Link>
  )
}
