'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { putObject } from '@/lib/storage/blob'
import { getCareersTenant } from './scope'

const MAX_CV_BYTES = 8 * 1024 * 1024

/** Public job application → creates a candidate (stage 'applied', source 'web') + optional CV upload. */
export async function applyToJob(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  // Honeypot — bots fill hidden field; silently accept (no record).
  if (((formData.get('website') as string) || '').trim()) return { ok: true }

  const t = await getCareersTenant()
  if (!t) return { error: 'Nábor právě neprobíhá.' }

  const jobId = (formData.get('jobId') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  const message = (formData.get('message') as string)?.trim() || null
  if (!jobId || !name) return { error: 'Vyplňte jméno.' }
  if (!email && !phone) return { error: 'Uveďte e-mail nebo telefon.' }

  const admin = createAdminClient()
  const { data: job } = await admin
    .from('hr_job_postings')
    .select('id')
    .eq('id', jobId).eq('tenant_id', t.tenantId).eq('status', 'open').eq('published', true)
    .maybeSingle()
  if (!job) return { error: 'Tato pozice už není dostupná.' }

  let cvPath: string | null = null
  const file = formData.get('cv') as File | null
  if (file && file.size > 0) {
    if (file.size > MAX_CV_BYTES) return { error: 'CV je větší než 8 MB.' }
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    const path = `applications/${crypto.randomUUID()}${ext}`
    const up = await putObject(path, file, file.type || undefined)
    if (up.error) return { error: 'Nahrání CV se nezdařilo.' }
    cvPath = up.path ?? null
  }

  const { error } = await admin.from('hr_candidates').insert({
    tenant_id: t.tenantId, job_id: jobId, name, email, phone,
    cover_letter: message, source: 'web', stage: 'applied', cv_path: cvPath,
  })
  if (error) return { error: error.message }
  return { ok: true }
}
