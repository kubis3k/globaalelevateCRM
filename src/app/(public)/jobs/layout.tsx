import Image from 'next/image'
import Link from 'next/link'
import { getCareersTenant } from './scope'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// Public careers site — light by default; the toggle switches to dark and persists.
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const t = await getCareersTenant()
  const company = t?.companyName || 'Globaal Elevate Production s.r.o.'

  return (
    <div className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-[#06070b] dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#06070b]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-5 lg:px-8">
          <Link href="/jobs" className="flex items-center gap-2.5 sm:gap-3">
            <Image src="/logo.png" alt={company} width={160} height={48} className="logo-smart h-10 w-auto object-contain sm:h-9" priority />
            <span className="hidden text-sm font-medium tracking-wide text-amber-700 sm:inline dark:text-amber-200/90">KARIÉRA</span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="#pozice" className="hidden rounded-full border border-amber-500/30 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-400/20 sm:inline-flex dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-200 dark:hover:bg-amber-300/20">
              Volné pozice
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-zinc-200 sm:mt-20 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-5 sm:py-10 lg:px-8">
          <span>© {company}</span>
          <span className="text-zinc-400 dark:text-zinc-600">Pracuj s námi · klub &amp; eventy</span>
        </div>
      </footer>
    </div>
  )
}
