'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Stažení PDF reportu. Route /api/portal/reports/[id]/pdf ověří scope (jen svůj,
// jen odeslaný) a vrátí attachment.
export function ReportDownload({ id }: { id: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.open(`/api/portal/reports/${id}/pdf`, '_blank')} title="Stáhnout PDF reportu">
      <Download className="size-3.5" />
      PDF
    </Button>
  )
}
