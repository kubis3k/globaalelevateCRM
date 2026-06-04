import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCareersTenant, EMPLOYMENT_TYPES } from '../scope'
import { ApplyForm } from '../apply-form'
import { ArrowLeft, MapPin, Banknote, Briefcase } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getCareersTenant()
  if (!t) notFound()

  const admin = createAdminClient()
  const { data: job } = await admin
    .from('hr_job_postings')
    .select('id, title, description, location, employment_type, salary_range, department_id')
    .eq('id', id).eq('tenant_id', t.tenantId).eq('status', 'open').eq('published', true)
    .maybeSingle()
  if (!job) notFound()

  let deptName: string | null = null
  if (job.department_id) {
    const { data } = await admin.from('hr_departments').select('name').eq('id', job.department_id).maybeSingle()
    deptName = data?.name ?? null
  }

  const neutralBadge = 'inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10'

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-amber-700 dark:text-zinc-400 dark:hover:text-amber-200"><ArrowLeft className="size-4" />Zpět na pozice</Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{job.title}</h1>
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
