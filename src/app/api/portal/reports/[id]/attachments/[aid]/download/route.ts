import { NextRequest } from 'next/server'
import { getPortalScope } from '@/app/(portal)/portal/scope'
import { blobResponse } from '@/lib/storage/blob'

// Stažení přílohy reportu pro klienta. Ownership: report musí patřit klientovi a
// být odeslaný; příloha musí patřit reportu.
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; aid: string }> }) {
  const { id, aid } = await params
  const { supabase, tenantId, clientId } = await getPortalScope()
  if (!clientId || !tenantId) return new Response('Forbidden', { status: 403 })

  const { data: rep } = await supabase.from('client_reports').select('id, client_id, status').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!rep || rep.client_id !== clientId || rep.status !== 'sent') return new Response('Not found', { status: 404 })

  const { data: att } = await supabase.from('client_report_attachments').select('name, storage_path').eq('id', aid).eq('report_id', id).maybeSingle()
  if (!att?.storage_path) return new Response('Not found', { status: 404 })

  return blobResponse(att.storage_path, { filename: att.name, attachment: true })
}
