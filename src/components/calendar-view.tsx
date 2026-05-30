'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Trash, Calendar as CalendarIcon, Clock, User, Shield, ChevronLeft, ChevronRight, Bell, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createEvent, deleteEvent } from '@/app/(dashboard)/calendar/actions'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type CalendarViewProps = {
  initialEvents: any[]
  teamMembers: any[]
  currentUserId: string
  currentUserRole: string
  tenantId: string
}

const MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Července', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
]

const DAYS_OF_WEEK = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrátor',
  manager: 'Manažer',
  employee: 'Zaměstnanec',
  external: 'Externista'
}

const ROLE_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  admin: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/30' },
  manager: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/30' },
  employee: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/30' },
  external: { bg: 'bg-zinc-50 dark:bg-zinc-800/40', text: 'text-zinc-700 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-850' }
}

export function CalendarView({ initialEvents, teamMembers, currentUserId, currentUserRole, tenantId }: CalendarViewProps) {
  const supabase = createClient()
  const [events, setEvents] = useState(initialEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([])
  const [selectedDateStr, setSelectedDateStr] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeEventDetail, setActiveEventDetail] = useState<any>(null)
  
  // States for the add form
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedStartTime, setSelectedStartTime] = useState('')
  const [selectedEndTime, setSelectedEndTime] = useState('')

  // Notifications Permission
  const [notificationPermission, setNotificationPermission] = useState('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const triggerLocalNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new window.Notification(title, {
        body,
        icon: '/favicon.ico'
      })
    }
  }

  // Subscribe to Realtime database changes
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  useEffect(() => {
    const channel = supabase
      .channel('calendar-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEvent = payload.new
            setEvents(prev => {
              if (prev.some(e => e.id === newEvent.id)) return prev
              return [...prev, newEvent].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            })

            // Check if user is assigned or role is assigned and trigger notification
            const isAssignedToMe = newEvent.assigned_to === currentUserId
            const isAssignedToMyRole = newEvent.assigned_role === currentUserRole

            if (isAssignedToMe || isAssignedToMyRole) {
              triggerLocalNotification(
                `Nová událost: ${newEvent.title}`,
                newEvent.description || 'Byla vám přiřazena nová událost v kalendáři.'
              )
            }
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setEvents(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, tenantId, currentUserId, currentUserRole])

  // Calendar dates generation logic
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay()
    return day === 0 ? 6 : day - 1 // Make Monday = 0
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDayIndex = getFirstDayOfMonth(year, month)

  const prevMonthDays = getDaysInMonth(year, month - 1)
  const calendarCells = []

  // Add previous month filler days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i)
    })
  }

  // Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    })
  }

  // Add next month filler days
  const totalCells = 42 // 6 rows of 7 days
  const nextDaysCount = totalCells - calendarCells.length
  for (let i = 1; i <= nextDaysCount; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    })
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.start_time)
      return eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
    })
  }

  const handleDayClick = (cellDate: Date) => {
    const dayEvents = getEventsForDay(cellDate)
    setSelectedDayEvents(dayEvents)
    
    // Format date string for the form
    const localDateStr = cellDate.toLocaleDateString('cs-CZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    setSelectedDateStr(localDateStr)
    
    // Pre-populate datetime fields
    const datePart = cellDate.toISOString().split('T')[0]
    setSelectedStartTime(`${datePart}T09:00`)
    setSelectedEndTime(`${datePart}T10:00`)
    
    setIsOpen(true)
  }

  const handleEventClick = (e: any, ev: any) => {
    e.stopPropagation() // Prevent day click trigger
    setActiveEventDetail(ev)
    setIsDetailOpen(true)
  }

  const handleAddEvent = async (formData: FormData) => {
    setFormLoading(true)
    setFormError('')
    try {
      await createEvent(formData)
      setIsOpen(false)
      // Local state is updated via Supabase Realtime channel automatically
    } catch (e: any) {
      setFormError(e.message || 'Chyba při ukládání události.')
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Opravdu chcete tuto událost smazat?')) {
      try {
        await deleteEvent(id)
        setIsDetailOpen(false)
        setActiveEventDetail(null)
      } catch (err: any) {
        alert(err.message || 'Událost se nepodařilo smazat.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sdílený kalendář</h2>
          <p className="text-zinc-500">Události, úkoly a deadliny vaší firmy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {notificationPermission !== 'granted' && (
            <Button variant="outline" onClick={requestNotificationPermission} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/20">
              <Bell className="mr-2 h-4 w-4 animate-bounce" />
              Povolit notifikace
            </Button>
          )}
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleDayClick(new Date())} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Nová událost
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Naplánovat událost</DialogTitle>
                <DialogDescription>
                  {selectedDateStr ? `Vybrané datum: ${selectedDateStr}` : 'Zadejte podrobnosti události.'}
                </DialogDescription>
              </DialogHeader>
              
              <form action={handleAddEvent} className="space-y-4 pt-2">
                {formError && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg font-medium border border-red-150 dark:border-red-900/30 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {formError}</div>}
                
                <div className="space-y-1.5">
                  <Label htmlFor="title">Název události / Úkolu</Label>
                  <Input id="title" name="title" required placeholder="Např. Porada týmu" className="focus-visible:ring-indigo-600" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Popis</Label>
                  <Input id="description" name="description" placeholder="Detaily..." className="focus-visible:ring-indigo-600" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_time">Začátek</Label>
                    <Input 
                      id="start_time" 
                      name="start_time" 
                      type="datetime-local" 
                      required 
                      value={selectedStartTime}
                      onChange={(e) => setSelectedStartTime(e.target.value)}
                      className="focus-visible:ring-indigo-600" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end_time">Konec</Label>
                    <Input 
                      id="end_time" 
                      name="end_time" 
                      type="datetime-local" 
                      required 
                      value={selectedEndTime}
                      onChange={(e) => setSelectedEndTime(e.target.value)}
                      className="focus-visible:ring-indigo-600" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="assigned_to">Člen týmu (Volitelné)</Label>
                    <Select name="assigned_to">
                      <SelectTrigger className="focus-visible:ring-indigo-600">
                        <SelectValue placeholder="Vyberte člena" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nepřiřazovat</SelectItem>
                        {teamMembers.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>{u.profiles?.full_name || u.profiles?.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="assigned_role">Role firmy (Volitelné)</Label>
                    <Select name="assigned_role">
                      <SelectTrigger className="focus-visible:ring-indigo-600">
                        <SelectValue placeholder="Vyberte roli" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nepřiřazovat</SelectItem>
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2" disabled={formLoading}>
                  {formLoading ? 'Ukládám...' : 'Uložit událost'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar layout card */}
      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
        {/* Navigation Toolbar */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-zinc-100 dark:border-zinc-850">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {MONTHS[month]} {year}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs font-semibold">Dnes</Button>
            <div className="flex border rounded-md">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-r-none border-r"><ChevronLeft className="h-4 w-4"/></Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-l-none"><ChevronRight className="h-4 w-4"/></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Day Names Grid */}
          <div className="grid grid-cols-7 text-center font-semibold text-xs border-b bg-zinc-50/50 dark:bg-zinc-900/20 py-2.5 text-zinc-500">
            {DAYS_OF_WEEK.map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 bg-zinc-200 dark:bg-zinc-850 gap-[1px]">
            {calendarCells.map((cell, index) => {
              const dayEvents = getEventsForDay(cell.date)
              const cellIsToday = isToday(cell.date)

              return (
                <div 
                  key={index} 
                  onClick={() => handleDayClick(cell.date)}
                  className={cn(
                    "min-h-[100px] sm:min-h-[120px] p-2 bg-white dark:bg-[#0d1117]/60 hover:bg-zinc-50 dark:hover:bg-white/4 flex flex-col cursor-pointer transition-colors duration-150 group",
                    !cell.isCurrentMonth && "text-zinc-300 dark:text-zinc-700 bg-zinc-50/30 dark:bg-zinc-900/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-xs font-semibold flex items-center justify-center h-6 w-6 rounded-full transition-transform group-hover:scale-105",
                      cellIsToday 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : cell.isCurrentMonth ? "text-zinc-900 dark:text-zinc-150" : "text-zinc-400 dark:text-zinc-700"
                    )}>
                      {cell.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-zinc-400 font-medium sm:block hidden">
                        {dayEvents.length} {dayEvents.length === 1 ? 'akce' : dayEvents.length < 5 ? 'akce' : 'akcí'}
                      </span>
                    )}
                  </div>
                  
                  {/* Event list preview */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[70px] sm:max-h-[90px] pr-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const roleColor = ev.assigned_role ? ROLE_COLORS[ev.assigned_role] : null

                      return (
                        <div 
                          key={ev.id}
                          onClick={(e) => handleEventClick(e, ev)}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border truncate transition-all hover:translate-x-0.5 shadow-sm font-medium",
                            roleColor 
                              ? `${roleColor.bg} ${roleColor.text} ${roleColor.border}`
                              : "bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-350 dark:border-slate-800"
                          )}
                        >
                          {ev.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 pl-1 text-center bg-indigo-50/50 dark:bg-indigo-950/20 rounded py-0.5">
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

      {/* Event Details dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[400px]">
          {activeEventDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">{activeEventDetail.title}</DialogTitle>
                <DialogDescription>
                  Detail naplánované události.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border">
                  <div className="text-zinc-500 font-medium">Popis:</div>
                  <div className="text-zinc-800 dark:text-zinc-200">{activeEventDetail.description || 'Bez popisu'}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-zinc-400 font-medium text-xs flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5"/> Datum</div>
                    <div className="font-semibold">{new Date(activeEventDetail.start_time).toLocaleDateString('cs-CZ')}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-zinc-400 font-medium text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> Čas</div>
                    <div className="font-semibold">
                      {new Date(activeEventDetail.start_time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(activeEventDetail.end_time).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  {activeEventDetail.assigned_to && (
                    <div className="space-y-1">
                      <div className="text-zinc-400 font-medium text-xs flex items-center gap-1"><User className="h-3.5 w-3.5"/> Uživatel</div>
                      <div className="font-medium bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded border text-xs">
                        {teamMembers.find(t => t.user_id === activeEventDetail.assigned_to)?.profiles?.full_name || 'Načítám...'}
                      </div>
                    </div>
                  )}

                  {activeEventDetail.assigned_role && (
                    <div className="space-y-1">
                      <div className="text-zinc-400 font-medium text-xs flex items-center gap-1"><Shield className="h-3.5 w-3.5"/> Role</div>
                      <div className={cn(
                        "font-medium px-2.5 py-1 rounded border text-xs w-fit",
                        ROLE_COLORS[activeEventDetail.assigned_role]?.bg,
                        ROLE_COLORS[activeEventDetail.assigned_role]?.text,
                        ROLE_COLORS[activeEventDetail.assigned_role]?.border
                      )}>
                        {ROLE_LABELS[activeEventDetail.assigned_role]}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>Zavřít</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(activeEventDetail.id)}>
                    <Trash className="mr-1.5 h-3.5 w-3.5" />
                    Smazat
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
