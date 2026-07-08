import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type CareersTenant = { tenantId: string; companyName: string; ico: string | null; intro: string | null }

/** The tenant that publishes its jobs publicly (toggle in company settings). */
export async function getCareersTenant(): Promise<CareersTenant | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('company_settings')
    .select('tenant_id, legal_name, ico, careers_intro')
    .eq('jobs_enabled', true)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { tenantId: data.tenant_id, companyName: data.legal_name || 'Globaal Elevate Production s.r.o.', ico: data.ico ?? null, intro: data.careers_intro ?? null }
}

export const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: 'Plný úvazek',
  part_time: 'Částečný úvazek',
  brigada: 'Brigáda',
  dohoda: 'Dohoda (DPP/DPČ)',
  other: 'Jiné',
}
