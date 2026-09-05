'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireTenant } from '@/lib/supabase/tenant'
import { removeObjects } from '@/lib/storage/blob'

// Klientské reporty — tvorba/úprava/odeslání. Jen interní role (ne external).
async function ctx() {
  const { supabase, user, tenantId, role, allowedModules } = await requireTenant()
  if (!tenantId || role === 'external' || !allowedModules.includes('reports')) {
    throw new Error('Nemáte oprávnění k reportům.')
  }
  return { supabase, user, tenantId }
}

export type ReportMetricInput = { label: string; value: string; note?: string | null }
export type ReportSectionInput = { heading?: string | null; body?: string | null }

export async function createClientReport(clientId: string, title: string): Promise<{ id?: string; error?: string }> {
  const { supabase, user, tenantId } = await ctx()
  if (!clientId) return { error: 'Vyberte klienta.' }
  const { data, error } = await supabase
    .from('client_reports')
    .insert({ tenant_id: tenantId, client_id: clientId, title: title?.trim() || 'Nový report', status: 'draft', created_by: user.id })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message || 'Nepodařilo se vytvořit report.' }
  revalidatePath('/reports/klienti')
  return { id: data.id as string }
}

// Form action z list page: založí draft a otevře editor.
export async function createReportFromForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get('clientId') || '')
  const title = String(formData.get('title') || '')
  const res = await createClientReport(clientId, title)
  redirect(res.id ? `/reports/klienti/${res.id}` : '/reports/klienti')
}

export async function saveClientReport(
  id: string,
  data: { title: string; periodLabel?: string | null; summary?: string | null; metrics: ReportMetricInput[]; sections: ReportSectionInput[] },
): Promise<{ ok?: true; error?: string }> {
  const { supabase, tenantId } = await ctx()
  // Ověř vlastnictví
  const { data: rep } = await supabase.from('client_reports').select('id').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!rep) return { error: 'Report nenalezen.' }

  const { error: upErr } = await supabase
    .from('client_reports')
    .update({ title: data.title?.trim() || 'Report', period_label: data.periodLabel?.trim() || null, summary: data.summary?.trim() || null })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (upErr) return { error: upErr.message }

  // Metriky + sekce: smaž a vlož znovu (jednoduché, report je malý).
  await supabase.from('client_report_metrics').delete().eq('report_id', id)
  await supabase.from('client_report_sections').delete().eq('report_id', id)

  const metrics = data.metrics.filter((m) => (m.label?.trim() || m.value?.trim()))
  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i]
    await supabase.from('client_report_metrics').insert({ report_id: id, position: i, label: m.label?.trim() || '', value: m.value?.trim() || '', note: m.note?.trim() || null })
  }
  const sections = data.sections.filter((s) => (s.heading?.trim() || s.body?.trim()))
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    await supabase.from('client_report_sections').insert({ report_id: id, position: i, heading: s.heading?.trim() || null, body: s.body?.trim() || null })
  }

  revalidatePath('/reports/klienti')
  revalidatePath(`/reports/klienti/${id}`)
  return { ok: true }
}

export async function sendClientReport(id: string): Promise<{ ok?: true; error?: string }> {
  const { supabase, tenantId } = await ctx()
  // POZOR: sent_at je timestamptz (drizzle mode 'date') → MUSÍ Date objekt, ne
  // ISO string. String hodí "e.toISOString is not a function" a celý update spadne.
  const { error } = await supabase.from('client_reports').update({ status: 'sent', sent_at: new Date() }).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { error: error.message }
  revalidatePath('/reports/klienti')
  revalidatePath(`/reports/klienti/${id}`)
  return { ok: true }
}

export async function unsendClientReport(id: string): Promise<{ ok?: true; error?: string }> {
  const { supabase, tenantId } = await ctx()
  const { error } = await supabase.from('client_reports').update({ status: 'draft', sent_at: null }).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { error: error.message }
  revalidatePath('/reports/klienti')
  revalidatePath(`/reports/klienti/${id}`)
  return { ok: true }
}

// ── Přílohy ───────────────────────────────────────────────────────────────
// Soubor se nahraje z browseru přímo do Blobu přes /api/blob/documents (client
// upload token, odmítá external), pak se zaregistruje sem.
export async function addReportAttachment(
  reportId: string,
  input: { path: string; name: string; contentType?: string | null; size?: number | null },
): Promise<{ id?: string; error?: string }> {
  const { supabase, user, tenantId } = await ctx()
  const { data: rep } = await supabase.from('client_reports').select('id').eq('id', reportId).eq('tenant_id', tenantId).maybeSingle()
  if (!rep) return { error: 'Report nenalezen.' }
  const { data, error } = await supabase
    .from('client_report_attachments')
    .insert({ report_id: reportId, name: input.name, storage_path: input.path, mime_type: input.contentType ?? null, file_size: input.size ?? null, uploaded_by: user.id })
    .select('id')
    .maybeSingle()
  if (error) return { error: error.message }
  revalidatePath(`/reports/klienti/${reportId}`)
  return { id: data?.id as string }
}

export async function deleteReportAttachment(reportId: string, attachmentId: string): Promise<{ ok?: true; error?: string }> {
  const { supabase, tenantId } = await ctx()
  const { data: rep } = await supabase.from('client_reports').select('id').eq('id', reportId).eq('tenant_id', tenantId).maybeSingle()
  if (!rep) return { error: 'Report nenalezen.' }
  const { data: att } = await supabase.from('client_report_attachments').select('storage_path').eq('id', attachmentId).eq('report_id', reportId).maybeSingle()
  if (att?.storage_path) await removeObjects([att.storage_path])
  await supabase.from('client_report_attachments').delete().eq('id', attachmentId).eq('report_id', reportId)
  revalidatePath(`/reports/klienti/${reportId}`)
  return { ok: true }
}

export async function deleteClientReport(id: string): Promise<void> {
  const { supabase, tenantId } = await ctx()
  await supabase.from('client_reports').delete().eq('id', id).eq('tenant_id', tenantId)
  revalidatePath('/reports/klienti')
  redirect('/reports/klienti')
}
