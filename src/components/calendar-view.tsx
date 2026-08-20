'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Trash, Calendar as CalendarIcon, Clock, User, Shield, ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'
import { createEvent, deleteEvent } from '@/app/(dashboard)/calendar/actions'
import { cn } from '@/lib/utils'

type CalendarViewProps = {
  initialEvents: any[]
  teamMembers: any[]
  companyRoles: { id: string; name: string }[]
  currentUserId: string
  currentUserRole: string
  currentUserCustomRoleId: string | null
  tenantId: string
}

const MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Července', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec']
const DAYS_OF_WEEK = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrátor', manager: 'Manažer', employee: 'Zaměstnanec', external: 'Externista',
}
const ROLE_CHIP: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-warning/15 text-warning-foreground border-warning/25 dark:text-warning',
  employee: 'bg-success/12 text-success border-success/20',
  external: 'bg-muted text-muted-foreground border-border',
}

export function CalendarView({ initialEvents, teamMembers, companyRoles, currentUserId, currentUserRole, currentUserCustomRoleId, tenantId }: CalendarViewProps) {
  const roleNameById = new Map(companyRoles.map((r) => [r.id, r.name]))
  const eventRoleName = (ev: any): string | null =>
    ev?.assigned_custom_role_id ? (roleNameById.get(ev.assigned_custom_role_id) || 'Role')
      : (ev?.assigned_role ? ROLE_LABELS[ev.assigned_role] : null)
  const eventChipClass = (ev: any): string =>
    ev?.assigned_custom_role_id ? 'bg-primary/10 text-primary border-primary/20'
      : (ev?.assigned_role ? (ROLE_CHIP[ev.assigned_role] || 'border-border bg-muted text-foreground') : 'border-border bg-muted text-foreground')
  const [events, setEvents] = useState(initialEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateStr, setSelectedDateStr] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeEventDetail, setActiveEventDetail] = useState<any>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedStartTime, setSelectedStartTime] = useState('')
  const [selectedEndTime, setSelectedEndTime] = useState('')
  const [notificationPermission, setNotificationPermission] = useState('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setNotificationPermission(Notification.permission)
  }, [])

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(await Notification.requestPermission())
    }
  }

  const triggerLocalNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new window.Notification(title, { body, icon: '/favicon.ico' })
    }
  }

  useEffect(() => { setEvents(initialEvents) }, [initialEvents])

  // Živé postgres_changes přes Supabase Realtime odstraněno s přechodem na
  // Neon (žádná ekvivalentní služba) — kalendář se teď aktualizuje jen po
  // akci/obnovení stránky, ne automaticky mezi klienty v reálném čase.

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay()
    return day === 0 ? 6 : day - 1
  }
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayIndex = getFirstDayOfMonth(year, month)
  const prevMonthDays = getDaysInMonth(year, month - 1)
  const calendarCells: { day: number; isCurrentMonth: boolean; date: Date }[] = []
  for (let i = firstDayIndex - 1; i >= 0; i--) calendarCells.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) })
  for (let i = 1; i <= daysInMonth; i++) calendarCells.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) })
  for (let i = 1; i <= 42 - calendarCells.length; i++) calendarCells.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) })

  const isToday = (date: Date) => {
    const t = new Date()
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear()
  }
  const getEventsForDay = (date: Date) =>
    events.filter((e) => {
      const d = new Date(e.start_time)
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
    })

  const handleDayClick = (cellDate: Date) => {
    setSelectedDateStr(cellDate.toLocaleDateString('cs-CZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    const datePart = cellDate.toISOString().split('T')[0]
    setSelectedStartTime(`${datePart}T09:00`)
    setSelectedEndTime(`${datePart}T10:00`)
    setIsOpen(true)
  }

  const handleEventClick = (e: React.MouseEvent, ev: any) => {
    e.stopPropagation()
    setActiveEventDetail(ev)
    setIsDetailOpen(true)
  }

  const handleAddEvent = async (formData: FormData) => {
    setFormLoading(true)
    try {
      await createEvent(formData)
      toast.success('Událost uložena')
      setIsOpen(false)
    } catch (e: any) {
      toast.error('Chyba', e?.message || 'Událost se nepodařilo uložit.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: 'Smazat událost?', description: 'Tato akce je nevratná.', confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    try {
      await deleteEvent(id)
      toast.success('Událost smazána')
      setIsDetailOpen(false)
      setActiveEventDetail(null)
    } catch (err: any) {
      toast.error('Chyba', err?.message || 'Událost se nepodařilo smazat.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sdílený kalendář" description="Události, úkoly a deadliny vaší firmy.">
        {notificationPermission !== 'granted' && (
          <Button variant="outline" size="lg" onClick={requestNotificationPermission}>
            <Bell className="size-4" />
            Povolit notifikace
          </Button>
        )}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button size="lg" onClick={() => handleDayClick(new Date())} />}>
            <CalendarPlus className="size-4" />
            Nová událost
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Naplánovat událost</DialogTitle>
              <DialogDescription>{selectedDateStr ? `Vybrané datum: ${selectedDateStr}` : 'Zadejte podrobnosti události.'}</DialogDescription>
            </DialogHeader>
            <form action={handleAddEvent} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="title">Název události / úkolu</Label>
                <Input id="title" name="title" required placeholder="Např. Porada týmu" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Popis</Label>
                <Input id="description" name="description" placeholder="Detaily…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start_time">Začátek</Label>
                  <Input id="start_time" name="start_time" type="datetime-local" required value={selectedStartTime} onChange={(e) => setSelectedStartTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_time">Konec</Label>
                  <Input id="end_time" name="end_time" type="datetime-local" required value={selectedEndTime} onChange={(e) => setSelectedEndTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="assigned_to">Člen týmu (volitelné)</Label>
                  <Select name="assigned_to">
                    <SelectTrigger className="w-full"><SelectValue placeholder="Vyberte člena" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nepřiřazovat</SelectItem>
                      {teamMembers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.profiles?.full_name || u.profiles?.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assigned_custom_role_id">Role firmy (volitelné)</Label>
                  <Select name="assigned_custom_role_id">
                    <SelectTrigger className="w-full"><SelectValue placeholder="Vyberte roli" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nepřiřazovat</SelectItem>
                      {companyRoles.length === 0 ? (
                        <SelectItem value="none" disabled>Žádné role — vytvoř je v Týmu</SelectItem>
                      ) : companyRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" size="lg" className="mt-1 w-full" disabled={formLoading}>
                {formLoading ? 'Ukládám…' : 'Uložit událost'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-4">
          <span className="text-lg font-semibold tracking-tight text-foreground">{MONTHS[month]} {year}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Dnes</Button>
            <div className="flex overflow-hidden rounded-lg border border-border">
              <Button variant="ghost" size="icon-sm" aria-label="Předchozí měsíc" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="rounded-none border-r border-border"><ChevronLeft className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label="Další měsíc" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="rounded-none"><ChevronRight className="size-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 py-2 text-center text-xs font-semibold text-muted-foreground">
            {DAYS_OF_WEEK.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {calendarCells.map((cell, index) => {
              const dayEvents = getEventsForDay(cell.date)
              const cellIsToday = isToday(cell.date)
              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(cell.date)}
                  className={cn(
                    'group flex min-h-[100px] cursor-pointer flex-col bg-card p-2 transition-colors hover:bg-muted/50 sm:min-h-[120px]',
                    !cell.isCurrentMonth && 'bg-muted/30'
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                      cellIsToday ? 'bg-primary text-primary-foreground' : cell.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
                    )}>
                      {cell.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">
                        {dayEvents.length} {dayEvents.length === 1 ? 'akce' : dayEvents.length < 5 ? 'akce' : 'akcí'}
                      </span>
                    )}
                  </div>
                  <div className="max-h-[70px] flex-1 space-y-1 overflow-y-auto pr-0.5 sm:max-h-[90px]">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => handleEventClick(e, ev)}
                        className={cn(
                          'truncate rounded border px-1.5 py-0.5 text-[10px] font-medium transition-transform hover:translate-x-0.5',
                          eventChipClass(ev)
                        )}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="rounded bg-primary/10 py-0.5 text-center text-[9px] font-semibold text-primary">
                        + {dayEvents.length - 3} další
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md">
          {activeEventDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{activeEventDetail.title}</DialogTitle>
                <DialogDescription>Detail naplánované události.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Popis</div>
                  <div className="mt-0.5 text-foreground">{activeEventDetail.description || 'Bez popisu'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><CalendarIcon className="size-3.5" /> Datum</div>
                    <div className="font-semibold tabular-nums text-foreground">{new Date(activeEventDetail.start_time).toLocaleDateString('cs-CZ')}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Clock className="size-3.5" /> Čas</div>
                    <div className="font-semibold tabular-nums text-foreground">
                      {new Date(activeEventDetail.start_time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} – {new Date(activeEventDetail.end_time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                {(activeEventDetail.assigned_to || eventRoleName(activeEventDetail)) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                    {activeEventDetail.assigned_to && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><User className="size-3.5" /> Uživatel</div>
                        <div className="w-fit rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                          {teamMembers.find((t) => t.user_id === activeEventDetail.assigned_to)?.profiles?.full_name || '—'}
                        </div>
                      </div>
                    )}
                    {eventRoleName(activeEventDetail) && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Shield className="size-3.5" /> Role</div>
                        <div className={cn('w-fit rounded-md border px-2 py-0.5 text-xs font-medium', eventChipClass(activeEventDetail))}>
                          {eventRoleName(activeEventDetail)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>Zavřít</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(activeEventDetail.id)}>
                    <Trash className="size-3.5" /> Smazat
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
