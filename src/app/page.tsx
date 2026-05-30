import { redirect } from 'next/navigation'
import { requireTenant } from '@/lib/supabase/tenant'
import { moduleHref } from '@/lib/modules'

export default async function Home() {
  const { allowedModules } = await requireTenant()
  redirect(allowedModules[0] ? moduleHref(allowedModules[0]) : '/no-access')
}
