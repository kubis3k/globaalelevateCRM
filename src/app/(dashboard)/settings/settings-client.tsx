'use client'

import { useTransition } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { saveCompanySettings } from './actions'

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}

export function SettingsClient({ settings, canManage }: { settings: any | null; canManage: boolean }) {
  const [pending, start] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => { const res = await saveCompanySettings(fd); if (res?.error) { toast.error('Chyba', res.error); return } toast.success('Nastavení uloženo') })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!canManage && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Fakturační údaje může upravovat jen administrátor nebo manažer.</p>}

      <Card>
        <CardHeader><CardTitle>Identifikace</CardTitle><CardDescription>Název a daňové údaje dodavatele</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Obchodní název" className="sm:col-span-2"><Input name="legalName" defaultValue={settings?.legal_name ?? ''} disabled={!canManage} placeholder="Globaal Elevate Production s.r.o." /></Field>
          <Field label="IČO"><Input name="ico" defaultValue={settings?.ico ?? ''} disabled={!canManage} /></Field>
          <Field label="DIČ"><Input name="dic" defaultValue={settings?.dic ?? ''} disabled={!canManage} /></Field>
          <div className="flex items-center gap-2 pt-6"><input type="checkbox" name="vatPayer" defaultChecked={settings ? settings.vat_payer : true} disabled={!canManage} className="size-4 rounded border-input accent-primary" /><Label className="text-sm">Plátce DPH</Label></div>
          <Field label="Výchozí sazba DPH (%)"><Input type="number" step="1" min="0" name="defaultVatRate" defaultValue={settings?.default_vat_rate ?? 21} disabled={!canManage} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sídlo</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Ulice a č. p." className="sm:col-span-2"><Input name="street" defaultValue={settings?.street ?? ''} disabled={!canManage} /></Field>
          <Field label="Město"><Input name="city" defaultValue={settings?.city ?? ''} disabled={!canManage} /></Field>
          <Field label="PSČ"><Input name="zip" defaultValue={settings?.zip ?? ''} disabled={!canManage} /></Field>
          <Field label="Země"><Input name="country" defaultValue={settings?.country ?? 'CZ'} disabled={!canManage} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Banka a kontakt</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Číslo účtu"><Input name="bankAccount" defaultValue={settings?.bank_account ?? ''} disabled={!canManage} /></Field>
          <Field label="IBAN"><Input name="iban" defaultValue={settings?.iban ?? ''} disabled={!canManage} /></Field>
          <Field label="E-mail"><Input type="email" name="email" defaultValue={settings?.email ?? ''} disabled={!canManage} /></Field>
          <Field label="Telefon"><Input name="phone" defaultValue={settings?.phone ?? ''} disabled={!canManage} /></Field>
        </CardContent>
      </Card>

      {canManage && <div className="flex justify-end"><Button type="submit" size="lg" disabled={pending}><Save className="size-4" />{pending ? 'Ukládám…' : 'Uložit'}</Button></div>}
    </form>
  )
}
