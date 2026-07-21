import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ArrowLeft, CalendarDays, Clock, MapPin, Music, ListOrdered } from 'lucide-react'
import { getPortalScope, getHiddenIds } from '../../scope'

const STATUS: Record<string, { label: string; variant: 'secondary' | 'info' | 'success' | 'destructive' }> = {
  planning: { label: 'Plánování', variant: 'secondary' },
  confirmed: { label: 'Potvrzeno', variant: 'info' },
  done: { label: 'Proběhlo', variant: 'success' },
  cancelled: { label: 'Zrušeno', variant: 'destructive' },
}
const hm = (t: string | null) => (t ? String(t).slice(0, 5) : null)

// Auto-share: viditelné, pokud event.client_id patří přihlášenému klientovi
// a nebylo výjimečně skryto (portal_visibility_overrides).
export default async function PortalEventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tenantId, clientId } = await getPortalScope()
  if (!clientId) notFound()

  const { data: event } = await supabase.from('events').select('*').eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!event || event.client_id !== clientId) notFound()

  const hidden = await getHiddenIds(supabase, clientId, 'event')
  if (hidden.has(event.id)) notFound()

  const [{ data: lineup }, { data: timeline }] = await Promise.all([
    supabase.from('event_lineup').select('artist, slot_start, slot_end, status, sort').eq('event_id', id).order('sort', { ascending: true }),
    supabase.from('event_timeline').select('at_time, item, sort').eq('event_id', id).order('sort', { ascending: true }),
  ])
  const st = STATUS[event.status] ?? STATUS.planning

  return (
    <div className="space-y-6">
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Zpět na přehled</Link>

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">{event.name}</h1>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
          {event.event_date && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{new Date(event.event_date).toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
          {hm(event.doors_time) && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />dveře {hm(event.doors_time)}{hm(event.start_time) ? ` · start ${hm(event.start_time)}` : ''}{hm(event.end_time) ? ` · do ${hm(event.end_time)}` : ''}</span>}
          {event.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{event.location}</span>}
        </div>
        {event.description && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{event.description}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Music className="size-4" />Line-up</CardTitle></CardHeader>
          <CardContent>
            {(lineup ?? []).length === 0 ? <EmptyState icon={Music} title="Line-up zatím není" /> : (
              <div className="divide-y divide-border">
                {(lineup ?? []).map((l: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="font-medium text-foreground">{l.artist}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{hm(l.slot_start) || ''}{hm(l.slot_end) ? `–${hm(l.slot_end)}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListOrdered className="size-4" />Program (run-of-show)</CardTitle></CardHeader>
          <CardContent>
            {(timeline ?? []).length === 0 ? <EmptyState icon={ListOrdered} title="Program zatím není" /> : (
              <div className="space-y-2.5">
                {(timeline ?? []).map((t: any, i: number) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="w-12 shrink-0 font-medium tabular-nums text-primary">{hm(t.at_time) || '—'}</span>
                    <span className="text-foreground/90">{t.item}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
