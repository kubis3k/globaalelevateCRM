import Link from 'next/link'
import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText, ArrowLeft, Plus, Pencil } from 'lucide-react'
import { createReportFromForm } from './actions'

const field = 'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring'

export default async function ClientReportsListPage() {
  const { supabase, tenantId } = await requireModuleAccess('reports')
  if (!tenantId) return <NoTenantView />

  const [{ data: reports }, { data: clients }] = await Promise.all([
    supabase.from('client_reports').select('id, title, period_label, status, created_at, sent_at, client_id').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('crm_clients').select('id, name').eq('tenant_id', tenantId).order('name'),
  ])
  const clientMap = new Map((clients ?? []).map((c: any) => [c.id as string, c.name as string]))
  const list = reports ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Klientské reporty" description="Reporty, které klient uvidí a stáhne v portálu jako PDF.">
        <Link href="/reports" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Zpět na Reporty
        </Link>
      </PageHeader>

      <form action={createReportFromForm} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Klient</label>
          <select name="clientId" required defaultValue="" className={field}>
            <option value="" disabled>Vyberte klienta…</option>
            {(clients ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Název reportu</label>
          <input name="title" placeholder="Např. Marketing – srpen 2026" className={field} />
        </div>
        <button type="submit" className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90">
          <Plus className="size-4" /> Nový report
        </button>
      </form>

      {list.length === 0 ? (
        <EmptyState icon={FileText} title="Žádné reporty" description="Vytvořte první klientský report výše." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Období</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{clientMap.get(r.client_id) ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{r.period_label ?? '—'}</TableCell>
                  <TableCell>
                    {r.status === 'sent' ? <Badge variant="success">Odesláno</Badge> : <Badge variant="info">Koncept</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/reports/klienti/${r.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                      <Pencil className="size-3.5" /> Upravit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
