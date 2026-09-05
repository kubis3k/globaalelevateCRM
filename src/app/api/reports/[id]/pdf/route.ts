import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadReportForPdf } from '@/lib/reports'
import { renderReportPdf } from '@/lib/pdf/report'

// Interní náhled PDF klientského reportu (pro tvorbu). Jen přihlášený interní
// uživatel s tenantem; role external sem nesmí (má portálovou routu).
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return new Response('Forbidden', { status: 403 })
  if ((tu.role as string) === 'external') return new Response('Forbidden', { status: 403 })

  const data = await loadReportForPdf(admin, tu.tenant_id as string, id)
  if (!data) return new Response('Not found', { status: 404 })

  const pdf = await renderReportPdf(data)
  const safe = (data.title || 'report').replace(/[^\w.-]+/g, '-')
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Report-${safe}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
