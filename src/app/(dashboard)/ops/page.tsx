import { requireModuleAccess } from '@/lib/supabase/tenant'
import { OpsWikiClient } from './ops-wiki-client'

export default async function OpsWikiPage() {
  const { supabase, tenantId } = await requireModuleAccess('ops')
  if (!tenantId) return null
  const { data: articles } = await supabase.from('sop_articles').select('*').eq('tenant_id', tenantId).order('category').order('title')
  return <OpsWikiClient articles={articles ?? []} />
}
