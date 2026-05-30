import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Users, FileText, DollarSign, Calendar, LogOut, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
    <div className="flex min-h-screen bg-[oklch(0.98_0.002_247)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[oklch(0.12_0.025_254)] flex flex-col shrink-0 relative">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 px-6 py-6 border-b border-white/8">
          <Image
            src="/logo.png"
            alt="Global Elevate"
            width={140}
            height={40}
            className="object-contain"
            priority
          />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 px-3 py-5 space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">Hlavní menu</p>
          <NavItem href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <NavItem href="/team" icon={<Users className="h-4 w-4" />} label="Tým a oprávnění" />
          <NavItem href="/invoices" icon={<FileText className="h-4 w-4" />} label="Faktury" />
          <NavItem href="/finance" icon={<DollarSign className="h-4 w-4" />} label="Live Finance" />
          <NavItem href="/calendar" icon={<Calendar className="h-4 w-4" />} label="Kalendář" />
        </nav>

        {/* User footer */}
        <div className="relative z-10 px-3 py-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{username}</div>
              <div className="text-xs text-slate-500">Aktivní session</div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Odhlásit se"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center px-8 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-900">Global Elevate</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-indigo-600 font-medium">CRM</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium">Systém online</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
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
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/8 hover:text-white transition-all duration-150 group"
    >
      <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">{icon}</span>
      {label}
    </Link>
  )
}
