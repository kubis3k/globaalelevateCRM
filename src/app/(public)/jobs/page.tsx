import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCareersTenant, EMPLOYMENT_TYPES } from './scope'
import { MapPin, Banknote, ArrowRight, Sparkles, Users, CalendarHeart } from 'lucide-react'

export const dynamic = 'force-dynamic'

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null
  const gold = type === 'brigada'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${gold ? 'bg-amber-400/15 text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/30' : 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10'}`}>
      {EMPLOYMENT_TYPES[type] ?? type}
    </span>
  )
}

export default async function JobsPage() {
  const t = await getCareersTenant()
  if (!t) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Nábor právě neprobíhá</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Momentálně nemáme otevřené žádné pozice. Mrkni sem zase někdy.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: jobs } = await admin
    .from('hr_job_postings')
    .select('id, title, description, location, employment_type, salary_range, department_id')
    .eq('tenant_id', t.tenantId).eq('status', 'open').eq('published', true)
    .order('created_at', { ascending: false })
  const list = jobs ?? []
  const deptIds = [...new Set(list.map((j: any) => j.department_id).filter(Boolean))]
  const { data: depts } = deptIds.length ? await admin.from('hr_departments').select('id, name').in('id', deptIds) : { data: [] as any[] }
  const deptName = (id: string | null) => (depts ?? []).find((d: any) => d.id === id)?.name || null

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_-10%,rgba(201,162,75,0.13),transparent_70%)] dark:bg-[radial-gradient(60%_60%_at_50%_-10%,rgba(201,162,75,0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-200"><Sparkles className="size-3.5" />Pracuj s námi</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl dark:text-white">Přidej se do týmu<br /><span className="text-amber-700 dark:text-amber-300">{t.companyName.replace(/\s*s\.r\.o\.?$/i, '')}</span></h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">{t.intro || 'Klub, eventy, produkce. Hledáme parťáky na stálo i na brigádu — od baru přes produkci až po promo. Vyber si pozici a ozvi se nám.'}</p>
            <a href="#pozice" className="mt-7 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-amber-300 dark:bg-amber-300 dark:text-[#06070b] dark:hover:bg-amber-200">Volné pozice <ArrowRight className="size-4" /></a>
          </div>
          <div className="mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { icon: Users, t: 'Skvělý tým', d: 'Parta, se kterou tě práce baví.' },
              { icon: CalendarHeart, t: 'Flexibilní brigády', d: 'Směny, co sednou ke škole i práci.' },
              { icon: Sparkles, t: 'Akce a zážitky', d: 'Buď u toho, kde se to děje.' },
            ].map((p, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p.icon className="size-5 text-amber-700 dark:text-amber-300" />
                <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">{p.t}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{p.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positions */}
      <section id="pozice" className="mx-auto max-w-6xl px-5 pb-8 lg:px-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Otevřené pozice {list.length > 0 && <span className="text-zinc-500">({list.length})</span>}</h2>
        {list.length === 0 ? (
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Aktuálně nemáme otevřené žádné pozice. Sleduj nás na sítích — brzy přibydou.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {list.map((j: any) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-amber-500/40 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-300/40 dark:hover:bg-white/[0.05]">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-200">{j.title}</h3>
                  <TypeBadge type={j.employment_type} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {deptName(j.department_id) && <span>{deptName(j.department_id)}</span>}
                  {j.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{j.location}</span>}
                  {j.salary_range && <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-200/90"><Banknote className="size-3.5" />{j.salary_range}</span>}
                </div>
                {j.description && <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{j.description}</p>}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300">Detail &amp; přihláška <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
