'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { admin: ReturnType<typeof createAdminClient>; userId: string; tenantId: string; role: string | null }

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejste přihlášen.' }
  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return { error: 'Organizace nenalezena.' }
  return { admin, userId: user.id, tenantId: tu.tenant_id, role: tu.role }
}

const str = (fd: FormData, k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null }

export async function saveCompanySettings(formData: FormData): Promise<{ error?: string }> {
  const c = await getCtx(); if ('error' in c) return c
  if (c.role !== 'admin' && c.role !== 'manager') return { error: 'Upravovat fakturační údaje může jen administrátor nebo manažer.' }
  const rate = str(formData, 'defaultVatRate')
  const { error } = await c.admin.from('company_settings').upsert({
    tenant_id: c.tenantId,
    legal_name: str(formData, 'legalName'),
    ico: str(formData, 'ico'),
    dic: str(formData, 'dic'),
    vat_payer: formData.get('vatPayer') === 'on',
    default_vat_rate: rate ? Number(rate.replace(',', '.')) : 21,
    street: str(formData, 'street'),
    city: str(formData, 'city'),
    zip: str(formData, 'zip'),
    country: str(formData, 'country') || 'CZ',
    bank_account: str(formData, 'bankAccount'),
    iban: str(formData, 'iban'),
    email: str(formData, 'email'),
    phone: str(formData, 'phone'),
    jobs_enabled: formData.get('jobsEnabled') === 'on',
    careers_intro: str(formData, 'careersIntro'),
    updated_at: new Date(),
  }, { onConflict: 'tenant_id' })
  if (error) return { error: error.message }
  revalidatePath('/settings'); return {}
}
