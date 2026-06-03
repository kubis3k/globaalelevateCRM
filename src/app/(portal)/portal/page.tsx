import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PartyPopper, CalendarDays, MapPin } from 'lucide-react'
import { getPortalScope } from './scope'

const STATUS: Record<string, { label: string; variant: 'secondary' | 'info' | 'success' | 'destructive' }> = {
  planning: { label: 'Plánování', variant: 'secondary' },
  confirmed: { label: 'Potvrzeno', variant: 'info' },
  done: { label: 'Proběhlo', variant: 'success' },
  cancelled: { label: 'Zrušeno', variant: 'destructive' },
}

export default async function PortalHomePage() {
  const { supabase, user, access } = await getPortalScope()

  const { data: links } = await supabase.from('portal_event_access').select('event_id').eq('user_id', user.id)
  const eventIds = (links ?? []).map((l: any) => l.event_id)
  const { data: events } = eventIds.length
    ? await supabase.from('events').select('id, name, event_date, doors_time, start_time, location, status, description').in('id', eventIds).order('event_date', { ascending: true })
    : { data: [] as any[] }

  return (
    <div className="space-y-6">
      <PageHeader title={access?.display_name ? `Vítejte, ${access.display_name}` : 'Vaše akce'} description="Přehled vašich akcí, faktur a dokumentů." />
      {(events ?? []).length === 0 ? (
        <EmptyState icon={PartyPopper} title="Zatím žádné akce" description="Jakmile vám bude přiřazena akce, objeví se zde." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(events ?? []).map((e: any) => {
            const st = STATUS[e.status] ?? STATUS.planning
            return (
              <Card key={e.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground">{e.name}</h3>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {e.event_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{new Date(e.event_date).toLocaleDateString('cs-CZ')}{e.doors_time ? ` · ${String(e.doors_time).slice(0, 5)}` : ''}</span>}
                    {e.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{e.location}</span>}
                  </div>
                  {e.description && <p className="text-sm text-foreground/90">{e.description}</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
