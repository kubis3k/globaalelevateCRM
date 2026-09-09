'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin, Banknote, ArrowRight } from 'lucide-react'

// Labely duplikované (scope.ts je 'server-only', nejde importovat do klienta).
const TYPE_LABELS: Record<string, string> = {
  full_time: 'Plný úvazek',
  part_time: 'Částečný úvazek',
  brigada: 'Brigáda',
  dohoda: 'Dohoda (DPP/DPČ)',
  other: 'Jiné',
}

export type PublicJob = {
  id: string
  title: string
  description: string | null
  location: string | null
  employment_type: string | null
  salary_range: string | null
  deptName: string | null
}

const chip = (active: boolean) =>
  `inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? 'bg-amber-400 text-zinc-900 dark:bg-amber-300 dark:text-[#06070b]'
      : 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/10'
  }`

export function PositionsList({ jobs }: { jobs: PublicJob[] }) {
  const [type, setType] = useState<string>('all')
  const [dept, setDept] = useState<string>('all')

  const types = useMemo(() => [...new Set(jobs.map((j) => j.employment_type).filter(Boolean) as string[])], [jobs])
  const depts = useMemo(() => [...new Set(jobs.map((j) => j.deptName).filter(Boolean) as string[])], [jobs])

  const filtered = jobs.filter(
    (j) => (type === 'all' || j.employment_type === type) && (dept === 'all' || j.deptName === dept),
  )

  const hasFilters = types.length > 1 || depts.length > 1

  return (
    <div className="mt-5">
      {hasFilters && (
        <div className="mb-5 flex flex-col gap-3">
          {types.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setType('all')} className={chip(type === 'all')}>Vše</button>
              {types.map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={chip(type === t)}>{TYPE_LABELS[t] ?? t}</button>
              ))}
            </div>
          )}
          {depts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDept('all')} className={chip(dept === 'all')}>Všechny týmy</button>
              {depts.map((d) => (
                <button key={d} type="button" onClick={() => setDept(d)} className={chip(dept === d)}>{d}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">Pro tento filtr teď nemáme pozici. Zkus jiný filtr — nebo pošli spontánní přihlášku níže.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-amber-500/40 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-300/40 dark:hover:bg-white/[0.05]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-200">{j.title}</h3>
                {j.employment_type && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${j.employment_type === 'brigada' ? 'bg-amber-400/15 text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/30' : 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10'}`}>
                    {TYPE_LABELS[j.employment_type] ?? j.employment_type}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {j.deptName && <span>{j.deptName}</span>}
                {j.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{j.location}</span>}
                {j.salary_range && <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-200/90"><Banknote className="size-3.5" />{j.salary_range}</span>}
              </div>
              {j.description && <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{j.description}</p>}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300">Detail &amp; přihláška <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
