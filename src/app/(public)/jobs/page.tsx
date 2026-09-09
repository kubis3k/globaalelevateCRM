import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCareersTenant } from './scope'
import { PositionsList, type PublicJob } from './positions-list'
import { ApplyForm } from './apply-form'
import {
  ArrowRight, Sparkles, Users, CalendarHeart, PartyPopper, Megaphone, Globe,
  Handshake, Building2, GlassWater, Rocket, Coins, Send, PhoneCall, MessageCircle, UserCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getCareersTenant()
  const company = t?.companyName || 'Globaal Elevate Production'
  const title = `Kariéra — ${company}`
  const description = `Volné pozice a brigády v ${company} — produkce a eventy, marketing, web i obchod. Přidej se do týmu.`
  return { title, description, openGraph: { title, description, type: 'website' } }
}

const AREAS = [
  { icon: PartyPopper, t: 'Produkce & eventy', d: 'Příprava a realizace akcí, koncertů a párty — od plánu po realizaci na place.' },
  { icon: Megaphone, t: 'Marketing & sítě', d: 'Obsah, kampaně, správa sociálních sítí, grafika a video.' },
  { icon: Globe, t: 'Web & digitál', d: 'Weby, e-shop, online nástroje a jejich rozvoj.' },
  { icon: Handshake, t: 'Obchod & partnerství', d: 'Získávání klientů, spolupráce a sponzoring.' },
  { icon: Building2, t: 'Provoz & office', d: 'Koordinace, administrativa, HR a finance.' },
  { icon: GlassWater, t: 'Bar & event tým', d: 'Brigády na akcích — bar, promo, vstup, hostesky.' },
]

const BENEFITS = [
  { icon: Sparkles, t: 'Různorodá práce', d: 'Napříč firmou — od produkce po marketing.' },
  { icon: CalendarHeart, t: 'Flexibilní směny', d: 'Brigády, co sednou ke škole i práci.' },
  { icon: Rocket, t: 'Růst a zkušenosti', d: 'Uč se od lidí, co to umí.' },
  { icon: Users, t: 'Skvělý tým', d: 'Parta, se kterou tě práce baví.' },
  { icon: PartyPopper, t: 'Buď u toho', d: 'Tam, kde se to děje — akce i produkce.' },
  { icon: Coins, t: 'Férové podmínky', d: 'Jasná domluva a odměna.' },
]

const STEPS = [
  { icon: Send, t: 'Pošli přihlášku', d: 'Vyber pozici, nebo napiš spontánně. Zabere 2 minuty.' },
  { icon: PhoneCall, t: 'Ozveme se', d: 'Krátký telefonát nebo zpráva.' },
  { icon: MessageCircle, t: 'Poznáme se', d: 'Osobní nebo online pohovor.' },
  { icon: UserCheck, t: 'Nástup', d: 'Vítej v týmu.' },
]

const FAQ = [
  { q: 'Berete studenty a lidi bez praxe?', a: 'Ano. U řady pozic (brigády, event tým) praxi nepotřebuješ — hlavně chuť a spolehlivost.' },
  { q: 'Kde se pracuje?', a: 'Praha a na místech akcí. Část práce (marketing, web) jde i z domova.' },
  { q: 'Jaké formy spolupráce nabízíte?', a: 'Plný i částečný úvazek, dohody (DPP/DPČ) i brigády na akce.' },
  { q: 'Jak rychle se ozvete?', a: 'Snažíme se odpovědět do pár dní od přihlášky.' },
  { q: 'Nemáte teď mou pozici?', a: 'Pošli spontánní přihlášku níže — ozveme se, jakmile bude něco vhodného.' },
]

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
  const raw = jobs ?? []
  const deptIds = [...new Set(raw.map((j: any) => j.department_id).filter(Boolean))]
  const { data: depts } = deptIds.length ? await admin.from('hr_departments').select('id, name').in('id', deptIds) : { data: [] as any[] }
  const deptName = (id: string | null) => (depts ?? []).find((d: any) => d.id === id)?.name || null
  const list: PublicJob[] = raw.map((j: any) => ({
    id: j.id, title: j.title, description: j.description, location: j.location,
    employment_type: j.employment_type, salary_range: j.salary_range, deptName: deptName(j.department_id),
  }))
  const company = t.companyName.replace(/\s*s\.r\.o\.?$/i, '')

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_-10%,rgba(201,162,75,0.13),transparent_70%)] dark:bg-[radial-gradient(60%_60%_at_50%_-10%,rgba(201,162,75,0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-200"><Sparkles className="size-3.5" />Kariéra v {company}</span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl dark:text-white">Buduj s námi<br />produkci, eventy i značku</h1>
            <p className="mt-4 text-base text-zinc-600 sm:text-lg dark:text-zinc-300">{t.intro || `Jsme ${company} — děláme akce a produkci, marketing, weby i obchod. Hledáme parťáky na stálo, na dohodu i na brigádu. Vyber si oblast nebo pošli spontánní přihlášku.`}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#pozice" className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-amber-300 dark:bg-amber-300 dark:text-[#06070b] dark:hover:bg-amber-200">Volné pozice <ArrowRight className="size-4" /></a>
              <a href="#spontanni" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-100 dark:hover:bg-white/5">Spontánní přihláška</a>
            </div>
          </div>
        </div>
      </section>

      {/* Oblasti / týmy */}
      <section className="mx-auto max-w-6xl px-5 pb-4 lg:px-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Kde hledáme</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Nejsme jen eventy — {company} je produkce, marketing, web i obchod.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((a, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200"><a.icon className="size-5" /></span>
              <div className="mt-3 font-semibold text-zinc-900 dark:text-white">{a.t}</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Positions */}
      <section id="pozice" className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Otevřené pozice {list.length > 0 && <span className="text-zinc-500">({list.length})</span>}</h2>
        {list.length === 0 ? (
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Aktuálně nemáme otevřené žádné pozice. Sleduj nás na sítích — nebo pošli spontánní přihlášku níže.</p>
        ) : (
          <PositionsList jobs={list} />
        )}
      </section>

      {/* Proč u nás */}
      <section className="border-y border-zinc-200 bg-zinc-50/60 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Proč k nám</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200"><b.icon className="size-4" /></span>
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white">{b.t}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">{b.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jak probíhá nábor */}
      <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Jak probíhá nábor</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-700 dark:bg-amber-300/15 dark:text-amber-200"><s.icon className="size-4" /></span>
                <span className="text-xs font-semibold text-zinc-400">Krok {i + 1}</span>
              </div>
              <div className="mt-3 font-semibold text-zinc-900 dark:text-white">{s.t}</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-12 lg:px-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Časté dotazy</h2>
        <div className="mt-5 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
          {FAQ.map((f, i) => (
            <details key={i} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-zinc-900 dark:text-white">
                {f.q}
                <span className="text-amber-600 transition-transform group-open:rotate-45 dark:text-amber-300">+</span>
              </summary>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Spontánní přihláška */}
      <section id="spontanni" className="border-t border-zinc-200 bg-zinc-50/60 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Nenašel jsi svou pozici?</h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Napiš nám spontánní přihlášku. Řekni, o jakou oblast máš zájem (produkce, marketing, web, bar, brigády…), a ozveme se, jakmile bude něco vhodného.</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2"><Sparkles className="size-4 text-amber-600 dark:text-amber-300" />Bereme lidi na stálo, dohodu i brigády.</li>
                <li className="flex items-center gap-2"><Users className="size-4 text-amber-600 dark:text-amber-300" />I bez praxe — hlavně chuť a spolehlivost.</li>
              </ul>
            </div>
            <ApplyForm />
          </div>
        </div>
      </section>
    </div>
  )
}
