import 'server-only'

// Načte klientský report + související data pro PDF. `supabase` je admin (shim)
// klient z requireTenant/getPortalScope. Ownership (tenant/client/status)
// vynucuje volající route.
export type ReportPdfData = {
  id: string
  clientId: string
  status: string
  title: string
  periodLabel: string | null
  summary: string | null
  client: { name: string; ico: string | null }
  company: { name: string; ico: string | null; dic: string | null; address: string | null; email: string | null; phone: string | null }
  metrics: { label: string; value: string; note: string | null }[]
  sections: { heading: string | null; body: string | null }[]
  createdAt: string | null
  sentAt: string | null
}

export async function loadReportForPdf(supabase: any, tenantId: string, id: string): Promise<ReportPdfData | null> {
  const { data: r } = await supabase
    .from('client_reports')
    .select('id, client_id, status, title, period_label, summary, created_at, sent_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!r) return null

  const [{ data: client }, { data: company }, { data: metrics }, { data: sections }] = await Promise.all([
    supabase.from('crm_clients').select('name, ico').eq('tenant_id', tenantId).eq('id', r.client_id).maybeSingle(),
    supabase.from('company_settings').select('legal_name, ico, dic, street, city, zip, email, phone').eq('tenant_id', tenantId).maybeSingle(),
    supabase.from('client_report_metrics').select('label, value, note, position').eq('report_id', id).order('position'),
    supabase.from('client_report_sections').select('heading, body, position').eq('report_id', id).order('position'),
  ])

  const addr = company
    ? [company.street, [company.zip, company.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null
    : null

  return {
    id: r.id,
    clientId: r.client_id,
    status: r.status,
    title: r.title,
    periodLabel: r.period_label ?? null,
    summary: r.summary ?? null,
    client: { name: client?.name ?? 'Klient', ico: client?.ico ?? null },
    company: {
      name: company?.legal_name ?? 'Globaal Elevate',
      ico: company?.ico ?? null,
      dic: company?.dic ?? null,
      address: addr,
      email: company?.email ?? null,
      phone: company?.phone ?? null,
    },
    metrics: (metrics ?? []).map((m: any) => ({ label: m.label ?? '', value: m.value ?? '', note: m.note ?? null })),
    sections: (sections ?? []).map((s: any) => ({ heading: s.heading ?? null, body: s.body ?? null })),
    createdAt: r.created_at ?? null,
    sentAt: r.sent_at ?? null,
  }
}
