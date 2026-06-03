import { requireModuleAccess } from '@/lib/supabase/tenant'
import { ChecklistsClient } from './checklists-client'

export default async function OpsChecklistsPage() {
  const { supabase, tenantId } = await requireModuleAccess('ops')
  if (!tenantId) return null

  const [{ data: checklists }, { data: items }, { data: runs }, { data: runItems }] = await Promise.all([
    supabase.from('ops_checklists').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('ops_checklist_items').select('checklist_id, label, sort').eq('tenant_id', tenantId).order('sort', { ascending: true }),
    supabase.from('ops_checklist_runs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50),
    supabase.from('ops_checklist_run_items').select('*').eq('tenant_id', tenantId).order('sort', { ascending: true }),
  ])

  const templates = (checklists ?? []).map((cl: any) => ({
    ...cl,
    items: (items ?? []).filter((i: any) => i.checklist_id === cl.id).map((i: any) => i.label),
  }))
  const runsFull = (runs ?? []).map((r: any) => ({
    ...r,
    items: (runItems ?? []).filter((ri: any) => ri.run_id === r.id),
  }))

  return <ChecklistsClient templates={templates} runs={runsFull} />
}
