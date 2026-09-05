import { NextRequest } from 'next/server'
import { getPortalClientContext } from '@/app/(portal)/portal/scope'
import { getUctoInvoiceDetailForClient } from '@/lib/ucto'
import { renderInvoicePdf } from '@/lib/pdf/invoice'

// PDF vydané faktury pro klienta portálu. Ownership: getUctoInvoiceDetailForClient
// vrátí doklad jen když jeho účto-contact odpovídá klientovi (IČO/název) → external
// nestáhne cizí fakturu. pg + pdf-lib potřebují Node runtime.
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isFinite(numId)) return new Response('Not found', { status: 404 })

  const { client } = await getPortalClientContext()
  if (!client) return new Response('Forbidden', { status: 403 })

  const inv = await getUctoInvoiceDetailForClient(numId, { name: client.name, ico: client.ico })
  if (!inv) return new Response('Not found', { status: 404 })

  const pdf = await renderInvoicePdf(inv)
  const safeNo = (inv.number || String(inv.id)).replace(/[^\w.-]+/g, '-')
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Faktura-${safeNo}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
