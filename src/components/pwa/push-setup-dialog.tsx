'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bell, BellOff, Send, Loader2, Smartphone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  subscribeUser, unsubscribeUser, getNotificationPrefs, saveNotificationPrefs, sendTestNotification, type Prefs,
} from '@/lib/push/actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

const TYPES: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: 'calendar', label: 'Kalendář', desc: 'Nové úkoly a události' },
  { key: 'email', label: 'Pošta', desc: 'Nový příchozí e-mail' },
  { key: 'crm', label: 'CRM', desc: 'Úkoly a termíny' },
  { key: 'hr', label: 'HR', desc: 'Žádosti, smlouvy, schvalování' },
  { key: 'projects', label: 'Projekty', desc: 'Přiřazené úkoly' },
  { key: 'social', label: 'Sociální sítě', desc: 'Naplánované příspěvky' },
  { key: 'portal', label: 'Můj portál', desc: 'Směny, volno, docházka' },
  { key: 'events', label: 'Akce', desc: 'Nové akce a změny stavu' },
  { key: 'invoices', label: 'Faktury', desc: 'Nové a po splatnosti' },
]

export function PushSetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [supported, setSupported] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [standalone, setStandalone] = useState(true)
  const [prefs, setPrefs] = useState<Prefs>({ calendar: true, email: true, crm: true, hr: true, projects: true, social: true, events: true, invoices: true, portal: true })
  const [working, setWorking] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    const sup = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(sup)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)
    if (sup) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((s) => setSubscribed(!!s))
        .catch(() => {})
    }
    getNotificationPrefs().then(setPrefs).catch(() => {})
  }, [open])

  async function enable() {
    setWorking(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        toast.error('Notifikace nepovoleny', 'Povol je v nastavení prohlížeče/telefonu.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const res = await subscribeUser(JSON.parse(JSON.stringify(sub)))
      if (res?.error) { toast.error('Chyba', res.error); return }
      setSubscribed(true)
      toast.success('Notifikace zapnuty')
    } catch (e: any) {
      toast.error('Nepodařilo se zapnout', e?.message || '')
    } finally {
      setWorking(false)
    }
  }

  async function disable() {
    setWorking(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) { await sub.unsubscribe(); await unsubscribeUser(sub.endpoint) }
      setSubscribed(false)
      toast.success('Notifikace vypnuty')
    } finally {
      setWorking(false)
    }
  }

  function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    startTransition(async () => { await saveNotificationPrefs(next) })
  }

  function test() {
    startTransition(async () => {
      const res = await sendTestNotification()
      if (res?.error) toast.error('Test selhal', res.error)
      else toast.success('Testovací notifikace odeslána')
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notifikace</DialogTitle>
          <DialogDescription>Push upozornění na nové úkoly, poštu a další.</DialogDescription>
        </DialogHeader>

        {!supported ? (
          <p className="text-sm text-muted-foreground">Tento prohlížeč push notifikace nepodporuje.</p>
        ) : isIOS && !standalone ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground"><Smartphone className="size-4" />Nejdřív přidej na plochu</div>
            Na iPhonu/iPadu funguje push až po instalaci na plochu: tlačítko <strong>Sdílet</strong> ⎋ → <strong>Přidat na plochu</strong>. Pak appku otevři z plochy a vrať se sem.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="text-sm">
                <div className="font-medium text-foreground">{subscribed ? 'Zapnuto na tomto zařízení' : 'Vypnuto'}</div>
                <div className="text-xs text-muted-foreground">{subscribed ? 'Toto zařízení dostává upozornění.' : 'Zapni upozornění na tomto zařízení.'}</div>
              </div>
              {subscribed ? (
                <Button variant="outline" size="sm" disabled={working} onClick={disable}><BellOff className="size-4" />Vypnout</Button>
              ) : (
                <Button size="sm" disabled={working} onClick={enable}>{working ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}Povolit</Button>
              )}
            </div>

            {subscribed && (
              <>
                <div className="space-y-0.5">
                  {TYPES.map((t) => (
                    <button key={t.key} type="button" onClick={() => toggle(t.key)} className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-muted/50">
                      <span className="text-sm"><span className="font-medium text-foreground">{t.label}</span> <span className="text-xs text-muted-foreground">· {t.desc}</span></span>
                      <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', prefs[t.key] ? 'bg-primary' : 'bg-input')}>
                        <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', prefs[t.key] ? 'left-[18px]' : 'left-0.5')} />
                      </span>
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={test}><Send className="size-4" />Poslat testovací notifikaci</Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
