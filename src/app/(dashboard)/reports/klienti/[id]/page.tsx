import { notFound } from 'next/navigation'
import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { ReportEditor } from './report-editor'

export default async function ClientReportEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId } = await requireModuleAccess('reports')
  if (!tenantId) return <NoTenantView />

  const { data: report } = await supabase
    .from('client_reports')
    .select('id, client_id, title, period_label, summary, status, sent_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!report) notFound()

  const [{ data: client }, { data: metrics }, { data: sections }, { data: attachments }] = await Promise.all([
    supabase.from('crm_clients').select('name').eq('tenant_id', tenantId).eq('id', report.client_id).maybeSingle(),
    supabase.from('client_report_metrics').select('label, value, note, position').eq('report_id', id).order('position'),
    supabase.from('client_report_sections').select('heading, body, position').eq('report_id', id).order('position'),
    supabase.from('client_report_attachments').select('id, name, mime_type, file_size, created_at').eq('report_id', id).order('created_at', { ascending: true }),
  ])

  return (
    <ReportEditor
      report={report}
      clientName={client?.name ?? 'Klient'}
      initialMetrics={(metrics ?? []).map((m: any) => ({ label: m.label ?? '', value: m.value ?? '', note: m.note ?? '' }))}
      initialSections={(sections ?? []).map((s: any) => ({ heading: s.heading ?? '', body: s.body ?? '' }))}
      initialAttachments={(attachments ?? []).map((a: any) => ({ id: a.id as string, name: a.name as string, mimeType: a.mime_type ?? null, fileSize: a.file_size ?? null }))}
    />
  )
}
