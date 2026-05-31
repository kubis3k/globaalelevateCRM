import Link from 'next/link'
import { requireModuleAccess } from '@/lib/supabase/tenant'
import { StatCard } from '@/components/ui/stat-card'
import { StickyNote, ListTodo, AlarmClock, CalendarDays, Pin } from 'lucide-react'
import { getAssignedEvents } from './assigned'

const PRIORITY: Record<string, string> = { low: 'Nízká', normal: 'Běžná', high: 'Vysoká' }

export default async function PersonalOverviewPage() {
  const { supabase, user, tenantId, role } = await requireModuleAccess('personal')
  if (!tenantId) return null
  const uid = user.id
  const todayStr = new Date().toISOString().slice(0, 10)

  const [notesCount, openTasks, overdue, upcomingCount, events, tasks, pinned, assigned] = await Promise.all([
    supabase.from('personal_notes').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    supabase.from('personal_tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('done', false),
    supabase.from('personal_tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('done', false).lt('due_date', todayStr),
    supabase.from('personal_events').select('*', { count: 'exact', head: true }).eq('user_id', uid).gte('start_time', todayStr),
    supabase.from('personal_events').select('id, title, start_time, all_day').eq('user_id', uid).gte('start_time', todayStr).order('start_time', { ascending: true }).limit(6),
    supabase.from('personal_tasks').select('id, title, due_date, priority').eq('user_id', uid).eq('done', false).order('due_date', { ascending: true }).limit(6),
    supabase.from('personal_notes').select('id, title, content').eq('user_id', uid).eq('pinned', true).order('updated_at', { ascending: false }).limit(6),
    getAssignedEvents(supabase, tenantId, uid, role, todayStr),
  ])

  // Merge personal + assigned-shared upcoming events into one list.
  const upcoming = [
    ...(events.data ?? []).map((e: any) => ({ id: e.id, title: e.title, start: e.start_time, allDay: e.all_day, shared: false })),
    ...assigned.map((e) => ({ id: e.id, title: e.title, start: e.start_time, allDay: false, shared: true })),
  ].sort((a, b) => a.start.localeCompare(b.start)).slice(0, 6)

  const fmt = (s: string, allDay?: boolean) =>
    allDay ? new Date(s).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
           : new Date(s).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Poznámky" value={String(notesCount.count || 0)} hint="Soukromé poznámky" icon={<StickyNote className="size-4" />} />
        <StatCard title="Otevřené úkoly" value={String(openTasks.count || 0)} hint="K vyřízení" icon={<ListTodo className="size-4" />} />
        <StatCard title="Po termínu" value={String(overdue.count || 0)} hint="Úkoly se zmeškaným termínem" icon={<AlarmClock className="size-4" />} />
        <StatCard title="Nadcházející" value={String((upcomingCount.count || 0) + assigned.length)} hint={`Osobní + ${assigned.length} přiřazených`} icon={<CalendarDays className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="size-4 text-muted-foreground" />Nadcházející</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné nadcházející události. <Link href="/personal/calendar" className="text-primary hover:underline">Přidat</Link></p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={(e.shared ? 's' : 'p') + e.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={`size-1.5 shrink-0 rounded-full ${e.shared ? 'bg-amber-400' : 'bg-primary'}`} />
                    <span className="truncate text-foreground">{e.title}</span>
                    {e.shared && <span className="shrink-0 text-[10px] text-amber-600 dark:text-amber-400">přiřazené</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{fmt(e.start, e.allDay)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><ListTodo className="size-4 text-muted-foreground" />Úkoly k vyřízení</h3>
          {(tasks.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Hotovo! <Link href="/personal/tasks" className="text-primary hover:underline">Nový úkol</Link></p>
          ) : (
            <ul className="space-y-2">
              {(tasks.data ?? []).map((t: any) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-foreground">{t.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t.due_date ? new Date(t.due_date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) : PRIORITY[t.priority] || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Pin className="size-4 text-muted-foreground" />Připnuté poznámky</h3>
          {(pinned.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Žádné připnuté. <Link href="/personal/notes" className="text-primary hover:underline">Poznámky</Link></p>
          ) : (
            <ul className="space-y-2">
              {(pinned.data ?? []).map((n: any) => (
                <li key={n.id} className="text-sm">
                  <div className="truncate font-medium text-foreground">{n.title || '(bez názvu)'}</div>
                  <div className="truncate text-xs text-muted-foreground">{n.content}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
