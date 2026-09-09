'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { putObject } from '@/lib/storage/blob'
import { getCareersTenant } from './scope'

const MAX_CV_BYTES = 8 * 1024 * 1024

/**
 * Public job application → creates a candidate (stage 'applied') + optional CV.
 * Bez `jobId` = spontánní přihláška (job_id null, source 'web-spontaneous').
 * Portfolio/dostupnost/zájem o pozici se ukládají do cover_letter (bez migrace,
 * viditelné v HR náboru).
 */
export async function applyToJob(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  // Honeypot — bots fill hidden field; silently accept (no record).
  if (((formData.get('website') as string) || '').trim()) return { ok: true }

  const t = await getCareersTenant()
  if (!t) return { error: 'Nábor právě neprobíhá.' }

  const jobId = (formData.get('jobId') as string)?.trim() || null
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  const message = (formData.get('message') as string)?.trim() || null
  const portfolio = (formData.get('portfolio') as string)?.trim() || null
  const availability = (formData.get('availability') as string)?.trim() || null
  const desiredRole = (formData.get('desiredRole') as string)?.trim() || null
  if (!name) return { error: 'Vyplňte jméno.' }
  if (!email && !phone) return { error: 'Uveďte e-mail nebo telefon.' }

  const admin = createAdminClient()

  let validJobId: string | null = null
  if (jobId) {
    const { data: job } = await admin
      .from('hr_job_postings')
      .select('id')
      .eq('id', jobId).eq('tenant_id', t.tenantId).eq('status', 'open').eq('published', true)
      .maybeSingle()
    if (!job) return { error: 'Tato pozice už není dostupná.' }
    validJobId = jobId
  }

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

  const parts: string[] = []
  if (desiredRole && !validJobId) parts.push(`Zájem o pozici / oblast: ${desiredRole}`)
  if (message) parts.push(message)
  if (portfolio) parts.push(`Portfolio / odkaz: ${portfolio}`)
  if (availability) parts.push(`Dostupnost / nástup: ${availability}`)
  const coverLetter = parts.length ? parts.join('\n\n') : null

  const { error } = await admin.from('hr_candidates').insert({
    tenant_id: t.tenantId, job_id: validJobId, name, email, phone,
    cover_letter: coverLetter, source: validJobId ? 'web' : 'web-spontaneous', stage: 'applied', cv_path: cvPath,
  })
  if (error) return { error: error.message }
  return { ok: true }
}
