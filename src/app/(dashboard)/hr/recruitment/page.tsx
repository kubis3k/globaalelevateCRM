import { requireModuleAccess } from '@/lib/supabase/tenant'
import { canManageHr } from '@/lib/permissions'
import { EmptyState } from '@/components/ui/empty-state'
import { Lock } from 'lucide-react'
import { RecruitmentClient } from './recruitment-client'

export default async function HrRecruitmentPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('hr')
  if (!tenantId) return null
  if (!canManageHr(role)) {
    return <EmptyState icon={Lock} title="Nábor" description="Tato sekce je dostupná pouze administrátorům a manažerům." />
  }

  const [{ data: jobs }, { data: candidates }, { data: departments }] = await Promise.all([
    supabase.from('hr_job_postings').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('hr_candidates').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('hr_departments').select('*').eq('tenant_id', tenantId).order('name'),
  ])

  const deptName = (id: string | null) => (departments ?? []).find((d: any) => d.id === id)?.name || null
  const jobTitle = (id: string | null) => (jobs ?? []).find((j: any) => j.id === id)?.title || null

  const jobsFull = (jobs ?? []).map((j: any) => ({
    ...j, dept_name: deptName(j.department_id), candidate_count: (candidates ?? []).filter((c: any) => c.job_id === j.id).length,
  }))
  const candidatesFull = (candidates ?? []).map((c: any) => ({ ...c, job_title: jobTitle(c.job_id) }))

  return <RecruitmentClient jobs={jobsFull} candidates={candidatesFull} departments={departments ?? []} />
}
