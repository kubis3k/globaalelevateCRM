'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Přímé stažení PDF faktury. Route /api/portal/invoices/[id]/pdf si sama ověří
// scope (klient stáhne jen svou fakturu) a vrací attachment.
export function InvoiceDownload({ id }: { id: number }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(`/api/portal/invoices/${id}/pdf`, '_blank')}
      title="Stáhnout PDF faktury"
    >
      <Download className="size-3.5" />
      PDF
    </Button>
  )
}
