import { NextRequest } from 'next/server'
import { getPortalScope } from '@/app/(portal)/portal/scope'
import { loadReportForPdf } from '@/lib/reports'
import { renderReportPdf } from '@/lib/pdf/report'

// PDF klientského reportu pro portál. Klient stáhne jen SVŮJ report a jen když
// je odeslaný (status 'sent'). Ownership přes client_id == clientId.
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId, clientId } = await getPortalScope()
  if (!clientId) return new Response('Forbidden', { status: 403 })

  const data = await loadReportForPdf(supabase, tenantId, id)
  if (!data || data.clientId !== clientId || data.status !== 'sent') return new Response('Not found', { status: 404 })

  const pdf = await renderReportPdf(data)
  const safe = (data.title || 'report').replace(/[^\w.-]+/g, '-')
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Report-${safe}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
