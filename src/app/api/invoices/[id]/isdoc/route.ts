import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildIsdoc } from '@/lib/isdoc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ISDOC 6.0.1 export for a single invoice (tenant-scoped). Read-only.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Nejste přihlášen.', { status: 401 })

  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return new Response('Organizace nenalezena.', { status: 403 })

  const { data: invoice } = await admin.from('invoices').select('*').eq('id', id).eq('tenant_id', tu.tenant_id).maybeSingle()
  if (!invoice) return new Response('Faktura nenalezena.', { status: 404 })

  const { data: company } = await admin.from('company_settings').select('*').eq('tenant_id', tu.tenant_id).maybeSingle()
  let customer: any = null
  if (invoice.client_id) {
    const { data } = await admin.from('crm_clients').select('name, ico, dic, address').eq('id', invoice.client_id).eq('tenant_id', tu.tenant_id).maybeSingle()
    customer = data
  }

  const xml = buildIsdoc(invoice, company, customer)
  const safe = String(invoice.invoice_number || id).replace(/[^\w.-]/g, '_')
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="faktura-${safe}.isdoc"`,
      'Cache-Control': 'no-store',
    },
  })
}
