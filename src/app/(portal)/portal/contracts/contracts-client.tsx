'use client'

import { useTransition } from 'react'
import { Check, Download, FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { acceptContract, portalDocUrl } from '../actions'

const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const STATUS: Record<string, { label: string; variant: 'secondary' | 'success' | 'destructive' }> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  active: { label: 'Aktivní', variant: 'success' },
  expired: { label: 'Vypršela', variant: 'destructive' },
  terminated: { label: 'Ukončena', variant: 'secondary' },
}

export function ContractsClient({ contracts }: { contracts: any[] }) {
  const [pending, start] = useTransition()

  function download(id: string) {
    start(async () => {
      const r = await portalDocUrl(id)
      if (r?.error || !r.url) { toast.error('Chyba', r?.error || 'Nepodařilo se otevřít.'); return }
      window.open(r.url, '_blank', 'noopener,noreferrer')
    })
  }

  async function accept(c: any) {
    const ok = await confirmDialog({
      title: `Odsouhlasit smlouvu „${c.title}"?`,
      description: 'Potvrzením prohlašujete, že jste se seznámili s podmínkami smlouvy. Zaznamená se čas potvrzení.',
      confirmLabel: 'Souhlasím',
    })
    if (!ok) return
    start(async () => {
      const r = await acceptContract(c.id)
      if (r?.error) toast.error('Chyba', r.error); else toast.success('Smlouva odsouhlasena')
    })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {contracts.map((c) => {
        const st = STATUS[c.status] ?? STATUS.active
        return (
          <Card key={c.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSignature className="size-4 shrink-0 text-muted-foreground" />
                  <h3 className="font-medium text-foreground">{c.title}</h3>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              <div className="space-y-0.5 text-sm text-muted-foreground">
                <div>{c.party_label}{c.type ? ` · ${c.type}` : ''}</div>
                <div>
                  {c.start_date ? new Date(c.start_date).toLocaleDateString('cs-CZ') : '—'} – {c.end_date ? new Date(c.end_date).toLocaleDateString('cs-CZ') : '—'}
                </div>
                {c.value != null && <div>Hodnota: {czk(Number(c.value), c.currency)}</div>}
              </div>
              {c.note && <p className="text-sm text-foreground/80">{c.note}</p>}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                {c.document_id
                  ? <Button variant="outline" size="sm" disabled={pending} onClick={() => download(c.document_id)}><Download className="size-3.5" />Stáhnout</Button>
                  : <span />}
                {c.acknowledged_at
                  ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success"><Check className="size-3.5" />Odsouhlaseno {new Date(c.acknowledged_at).toLocaleDateString('cs-CZ')}</span>
                  : <Button size="sm" disabled={pending} onClick={() => accept(c)}><Check className="size-3.5" />Souhlasím</Button>}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
