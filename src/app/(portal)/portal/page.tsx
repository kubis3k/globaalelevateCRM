import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PartyPopper, CalendarDays, MapPin, FileText, FolderOpen, ArrowRight, Clock } from 'lucide-react'
import { getPortalScope } from './scope'

const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)
const STATUS: Record<string, { label: string; variant: 'secondary' | 'info' | 'success' | 'destructive' }> = {
  planning: { label: 'Plánování', variant: 'secondary' },
  confirmed: { label: 'Potvrzeno', variant: 'info' },
  done: { label: 'Proběhlo', variant: 'success' },
  cancelled: { label: 'Zrušeno', variant: 'destructive' },
}
const hm = (t: string | null) => (t ? String(t).slice(0, 5) : null)

export default async function PortalHomePage() {
  const { supabase, user, tenantId, access, clientId } = await getPortalScope()
  const today = new Date().toISOString().slice(0, 10)

  const { data: links } = await supabase.from('portal_event_access').select('event_id').eq('user_id', user.id)
  const eventIds = (links ?? []).map((l: any) => l.event_id)
  const [{ data: events }, { data: invoices }, { data: docLinks }] = await Promise.all([
    eventIds.length
      ? supabase.from('events').select('id, name, event_date, doors_time, start_time, location, status, description').in('id', eventIds).order('event_date', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    clientId
      ? supabase.from('invoices').select('amount, currency, status').eq('tenant_id', tenantId).eq('client_id', clientId).eq('type', 'issued')
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('portal_document_access').select('document_id').eq('user_id', user.id),
  ])

  const evs = events ?? []
  const upcoming = evs.filter((e: any) => !e.event_date || e.event_date >= today)
  const next = upcoming[0]
  const unpaid = (invoices ?? []).filter((i: any) => i.status === 'pending' || i.status === 'overdue')
  const unpaidAmount = unpaid.reduce((a: number, i: any) => a + Number(i.amount || 0), 0)
  const daysTo = next?.event_date ? Math.round((new Date(next.event_date).getTime() - Date.now()) / 864e5) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{access?.display_name ? `Vítejte, ${access.display_name}` : 'Vítejte'}</h1>
        <p className="text-sm text-muted-foreground">Přehled vašich akcí, faktur a dokumentů.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Nadcházející akce" value={String(upcoming.length)} hint={`${evs.length} celkem`} icon={<PartyPopper className="size-4" />} />
        <StatCard title="Nezaplacené faktury" value={String(unpaid.length)} hint={unpaid.length ? czk(unpaidAmount) : 'Vše uhrazeno'} tone={unpaid.length ? 'negative' : 'positive'} icon={<FileText className="size-4" />} />
        <StatCard title="Dokumenty" value={String((docLinks ?? []).length)} hint="Sdílené s vámi" icon={<FolderOpen className="size-4" />} />
      </div>

      {next && (
        <Link href={`/portal/events/${next.id}`} className="block">
          <Card className="overflow-hidden border-primary/30 transition-colors hover:border-primary/60">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Nejbližší akce</div>
                <div className="text-lg font-semibold text-foreground">{next.name}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {next.event_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{new Date(next.event_date).toLocaleDateString('cs-CZ')}</span>}
                  {hm(next.doors_time) && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />dveře {hm(next.doors_time)}</span>}
                  {next.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{next.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {daysTo != null && daysTo >= 0 && <div className="text-right"><div className="text-2xl font-bold tabular-nums text-foreground">{daysTo === 0 ? 'dnes' : `${daysTo} dní`}</div></div>}
                <ArrowRight className="size-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Vaše akce</h2>
        {evs.length === 0 ? (
          <EmptyState icon={PartyPopper} title="Zatím žádné akce" description="Jakmile vám bude přiřazena akce, objeví se zde." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {evs.map((e: any) => {
              const st = STATUS[e.status] ?? STATUS.planning
              return (
                <Link key={e.id} href={`/portal/events/${e.id}`} className="block">
                  <Card className="h-full transition-colors hover:border-primary/50">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground">{e.name}</h3>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {e.event_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{new Date(e.event_date).toLocaleDateString('cs-CZ')}{hm(e.doors_time) ? ` · ${hm(e.doors_time)}` : ''}</span>}
                        {e.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{e.location}</span>}
                      </div>
                      {e.description && <p className="line-clamp-2 text-sm text-foreground/80">{e.description}</p>}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
