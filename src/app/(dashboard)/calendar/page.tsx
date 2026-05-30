import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Trash, Calendar as CalendarIcon, Clock, User } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddEventForm } from './add-event-form'
import { deleteEvent } from './actions'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: currentUserData } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user?.id)
    .single()

  const { data: teamMembers } = await supabase
    .from('tenant_users')
    .select(`user_id, profiles (username, full_name)`)
    .eq('tenant_id', currentUserData?.tenant_id)

  const { data: events } = await supabase
    .from('calendar_events')
    .select(`
      *,
      profiles:assigned_to (full_name)
    `)
    .eq('tenant_id', currentUserData?.tenant_id)
    .order('start_time', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sdílený kalendář</h2>
          <p className="text-zinc-500">Události, úkoly a deadliny vaší firmy.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Nová událost
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Naplánovat událost</DialogTitle>
              <DialogDescription>
                Přidejte schůzku nebo úkol a volitelně přiřaďte členovi týmu.
              </DialogDescription>
            </DialogHeader>
            <AddEventForm users={teamMembers || []} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events?.map((ev: any) => (
          <Card key={ev.id} className="shadow-sm border-zinc-200 dark:border-zinc-800 flex flex-col hover:border-indigo-300 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{ev.title}</CardTitle>
                <form action={deleteEvent.bind(null, ev.id)}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <Trash className="h-4 w-4" />
                  </Button>
                </form>
              </div>
              <CardDescription className="text-sm line-clamp-2">{ev.description || 'Bez popisu'}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3 pb-4">
              <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                {new Date(ev.start_time).toLocaleDateString('cs-CZ')}
              </div>
              <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                <Clock className="mr-2 h-4 w-4 text-indigo-500" />
                {new Date(ev.start_time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.end_time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {ev.profiles && (
                <div className="flex items-center text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-2 py-1.5 rounded-md mt-2">
                  <User className="mr-2 h-3.5 w-3.5" />
                  Přiřazeno: {ev.profiles.full_name}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!events || events.length === 0 && (
          <div className="col-span-full py-16 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            Zatím nebyly naplánovány žádné události.
          </div>
        )}
      </div>
    </div>
  )
}
