import Image from 'next/image'
import Link from 'next/link'
import { getCareersTenant } from './scope'

// Public careers site — its own dark, premium look, independent of the internal app theme.
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const t = await getCareersTenant()
  const company = t?.companyName || 'Globaal Elevate Production s.r.o.'

  return (
    <div className="min-h-dvh bg-[#06070b] text-zinc-100 antialiased" style={{ colorScheme: 'dark' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06070b]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
          <Link href="/jobs" className="flex items-center gap-3">
            <Image src="/logo.png" alt={company} width={128} height={38} className="object-contain brightness-0 invert" priority />
            <span className="hidden text-sm font-medium tracking-wide text-amber-200/90 sm:inline">KARIÉRA</span>
          </Link>
          <a href="#pozice" className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/20">
            Volné pozice
          </a>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-20 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-10 text-sm text-zinc-500 sm:flex-row lg:px-8">
          <span>© {company}</span>
          <span className="text-zinc-600">Pracuj s námi · klub &amp; eventy</span>
        </div>
      </footer>
    </div>
  )
}
