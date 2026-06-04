import Image from 'next/image'
import Link from 'next/link'
import { getCareersTenant } from './scope'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// Public careers site — premium look, light/dark aware. Default follows the
// visitor's system preference; the toggle overrides it and persists to localStorage.
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const t = await getCareersTenant()
  const company = t?.companyName || 'Globaal Elevate Production s.r.o.'

  return (
    <>
      {/* Default theme = system preference (unless the visitor already chose one). Runs before paint. */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else if(t==='light'){document.documentElement.classList.remove('dark')}}catch(e){}})()` }} />
      <div className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-[#06070b] dark:text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#06070b]/80">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
            <Link href="/jobs" className="flex items-center gap-3">
              <Image src="/logo.png" alt={company} width={128} height={38} className="logo-smart object-contain" priority />
              <span className="hidden text-sm font-medium tracking-wide text-amber-700 sm:inline dark:text-amber-200/90">KARIÉRA</span>
            </Link>
            <div className="flex items-center gap-2">
              <a href="#pozice" className="rounded-full border border-amber-500/30 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-400/20 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-200 dark:hover:bg-amber-300/20">
                Volné pozice
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-20 border-t border-zinc-200 dark:border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-10 text-sm text-zinc-500 sm:flex-row lg:px-8">
            <span>© {company}</span>
            <span className="text-zinc-400 dark:text-zinc-600">Pracuj s námi · klub &amp; eventy</span>
          </div>
        </footer>
      </div>
    </>
  )
}
