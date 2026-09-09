import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCareersTenant } from './(public)/jobs/scope'

// Sitemap náborového webu (jobs.globaalelevate.com) — landing + detaily pozic.
// Slouží pro Google Search Console / Google Jobs. Interní app (work./klient.)
// je za loginem, tak indexujeme jen veřejný nábor.
export const dynamic = 'force-dynamic'
const BASE = 'https://jobs.globaalelevate.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/jobs`, changeFrequency: 'daily', priority: 1 },
  ]
  try {
    const t = await getCareersTenant()
    if (t) {
      const admin = createAdminClient()
      const { data: jobs } = await admin
        .from('hr_job_postings')
        .select('id, created_at')
        .eq('tenant_id', t.tenantId).eq('status', 'open').eq('published', true)
      for (const j of jobs ?? []) {
        entries.push({
          url: `${BASE}/jobs/${j.id}`,
          lastModified: j.created_at ? new Date(j.created_at) : undefined,
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    }
  } catch { /* sitemap best-effort — bez pozic vrať aspoň landing */ }
  return entries
}
