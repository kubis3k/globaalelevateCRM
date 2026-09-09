import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCareersTenant, EMPLOYMENT_TYPES } from '../scope'
import { ApplyForm } from '../apply-form'
import { ArrowLeft, MapPin, Banknote, Briefcase } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Mapování na schema.org JobPosting employmentType.
const SCHEMA_EMPLOYMENT: Record<string, string> = {
  full_time: 'FULL_TIME', part_time: 'PART_TIME', brigada: 'PART_TIME', dohoda: 'CONTRACTOR', other: 'OTHER',
}

async function loadJob(id: string) {
  const t = await getCareersTenant()
  if (!t) return null
  const admin = createAdminClient()
  const { data: job } = await admin
    .from('hr_job_postings')
    .select('id, title, description, location, employment_type, salary_range, department_id, created_at')
    .eq('id', id).eq('tenant_id', t.tenantId).eq('status', 'open').eq('published', true)
    .maybeSingle()
  if (!job) return null
  return { t, job }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const r = await loadJob(id)
  if (!r) return { title: 'Pozice není dostupná' }
  const desc = (r.job.description || `Volná pozice ${r.job.title} v ${r.t.companyName}.`).replace(/\s+/g, ' ').slice(0, 160)
  const title = `${r.job.title} — kariéra ${r.t.companyName}`
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: 'website' },
  }
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await loadJob(id)
  if (!r) notFound()
  const { t, job } = r

  let deptName: string | null = null
  if (job.department_id) {
    const admin = createAdminClient()
    const { data } = await admin.from('hr_departments').select('name').eq('id', job.department_id).maybeSingle()
    deptName = data?.name ?? null
  }

  const neutralBadge = 'inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10'

  // JobPosting structured data (Google Jobs).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || `Volná pozice ${job.title} v ${t.companyName}.`,
    datePosted: job.created_at ? new Date(job.created_at).toISOString().slice(0, 10) : undefined,
    employmentType: job.employment_type ? SCHEMA_EMPLOYMENT[job.employment_type] ?? 'OTHER' : undefined,
    hiringOrganization: { '@type': 'Organization', name: t.companyName, sameAs: 'https://globaalelevate.com' },
    jobLocation: job.location
      ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: 'CZ' } }
      : { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'CZ' } },
    directApply: true,
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-amber-700 dark:text-zinc-400 dark:hover:text-amber-200"><ArrowLeft className="size-4" />Zpět na pozice</Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">{job.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {job.employment_type && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${job.employment_type === 'brigada' ? 'bg-amber-400/15 text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-300/15 dark:text-amber-200 dark:ring-amber-300/30' : 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10'}`}><Briefcase className="size-3.5" />{EMPLOYMENT_TYPES[job.employment_type] ?? job.employment_type}</span>}
            {deptName && <span className={neutralBadge}>{deptName}</span>}
            {job.location && <span className={neutralBadge}><MapPin className="size-3.5" />{job.location}</span>}
            {job.salary_range && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700 ring-1 ring-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25"><Banknote className="size-3.5" />{job.salary_range}</span>}
          </div>
          <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{job.description || 'Detailní popis dodáme na pohovoru — ozvi se nám!'}</div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <ApplyForm jobId={job.id} />
        </div>
      </div>
    </div>
  )
}
