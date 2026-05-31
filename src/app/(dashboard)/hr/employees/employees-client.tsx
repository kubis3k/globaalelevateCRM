'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Building2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { createEmployee, updateEmployee, deleteEmployee, createDepartment, deleteDepartment } from '../actions'

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const EMP_TYPES: Record<string, string> = { full_time: 'Plný úvazek', part_time: 'Částečný', contract: 'Smlouva / IČO', intern: 'Stáž' }
const czk = (n: number, c = 'CZK') => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n)

type Person = { user_id: string; name: string; username?: string }
type Dept = { id: string; name: string }
type Employee = any

export function HrEmployeesClient({ employees, departments, people, available, canManage, isAdmin }: {
  employees: Employee[]; departments: Dept[]; people: Person[]; available: Person[]; canManage: boolean; isAdmin: boolean
}) {
  const [dialog, setDialog] = useState<{ open: boolean; employee: Employee | null }>({ open: false, employee: null })
  const [deptOpen, setDeptOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{employees.length} {employees.length === 1 ? 'zaměstnanec' : 'zaměstnanců'}</p>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={() => setDeptOpen(true)}><Building2 className="size-4" />Oddělení</Button>
            <Button size="lg" disabled={available.length === 0} onClick={() => setDialog({ open: true, employee: null })} title={available.length === 0 ? 'Všichni členové už mají kartu' : undefined}>
              <Plus className="size-4" />Přidat zaměstnance
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {employees.length === 0 ? (
          <EmptyState icon={Users} title="Žádní zaměstnanci" description={canManage ? 'Přidejte personální kartu členům týmu.' : 'Zatím nemáte vytvořenou personální kartu.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zaměstnanec</TableHead>
                <TableHead>Pozice</TableHead>
                <TableHead>Oddělení</TableHead>
                <TableHead>Úvazek</TableHead>
                <TableHead>Manažer</TableHead>
                <TableHead>Nástup</TableHead>
                {isAdmin && <TableHead className="text-right">Mzda</TableHead>}
                <TableHead>Stav</TableHead>
                {canManage && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={e.name} />
                      <div>
                        <div className="font-medium text-foreground">{e.name}</div>
                        {e.username && <div className="text-xs text-muted-foreground">@{e.username}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{e.position || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{e.department_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-muted-foreground">{EMP_TYPES[e.employment_type] || e.employment_type}</TableCell>
                  <TableCell className="text-muted-foreground">{e.manager_name || '—'}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{e.start_date ? new Date(e.start_date).toLocaleDateString('cs-CZ') : '—'}</TableCell>
                  {isAdmin && <TableCell className="text-right tabular-nums">{e.salary != null ? czk(Number(e.salary), e.salary_currency) : <span className="text-muted-foreground">—</span>}</TableCell>}
                  <TableCell><Badge variant={e.status === 'active' ? 'success' : 'secondary'}>{e.status === 'active' ? 'Aktivní' : 'Ukončeno'}</Badge></TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => setDialog({ open: true, employee: e })}><Edit2 className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Smazat kartu" disabled={isPending} className="text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            const ok = await confirmDialog({ title: `Smazat kartu — ${e.name}?`, description: 'Odebere personální údaje (účet zůstane).', confirmLabel: 'Smazat', destructive: true })
                            if (!ok) return
                            startTransition(async () => { const res = await deleteEmployee(e.id); if (res?.error) toast.error('Chyba', res.error); else toast.success('Karta smazána') })
                          }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {dialog.open && (
        <EmployeeDialog
          employee={dialog.employee}
          available={available}
          departments={departments}
          people={people}
          isAdmin={isAdmin}
          onClose={() => setDialog({ open: false, employee: null })}
        />
      )}
      {deptOpen && <DepartmentsDialog departments={departments} onClose={() => setDeptOpen(false)} />}
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}

function EmployeeDialog({ employee, available, departments, people, isAdmin, onClose }: {
  employee: Employee | null; available: Person[]; departments: Dept[]; people: Person[]; isAdmin: boolean; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!employee

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = isEdit ? await updateEmployee(employee.id, fd) : await createEmployee(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      toast.success(isEdit ? 'Zaměstnanec uložen' : 'Zaměstnanec přidán')
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Upravit: ${employee.name}` : 'Nový zaměstnanec'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {!isEdit && (
            <Field label="Zaměstnanec (účet)">
              <select name="userId" required defaultValue="" className={selectClass}>
                <option value="" disabled>— vyberte člena —</option>
                {available.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}{p.username ? ` (@${p.username})` : ''}</option>)}
              </select>
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pozice"><Input name="position" defaultValue={employee?.position || ''} placeholder="např. Marketing manažer" /></Field>
            <Field label="Oddělení">
              <select name="departmentId" defaultValue={employee?.department_id || 'none'} className={selectClass}>
                <option value="none">—</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Úvazek">
              <select name="employmentType" defaultValue={employee?.employment_type || 'full_time'} className={selectClass}>
                {Object.entries(EMP_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Manažer">
              <select name="managerId" defaultValue={employee?.manager_id || 'none'} className={selectClass}>
                <option value="none">—</option>
                {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Datum nástupu"><Input type="date" name="startDate" defaultValue={employee?.start_date || ''} /></Field>
            <Field label="Dní dovolené / rok"><Input type="number" name="annualLeaveDays" min={0} defaultValue={employee?.annual_leave_days ?? 20} /></Field>
            <Field label="Telefon"><Input name="phone" defaultValue={employee?.phone || ''} /></Field>
            <Field label="Osobní e-mail"><Input type="email" name="personalEmail" defaultValue={employee?.personal_email || ''} /></Field>
            {isAdmin && <Field label="Mzda (hrubá / měsíc)"><Input type="number" step="0.01" name="salary" defaultValue={employee?.salary ?? ''} /></Field>}
            {isAdmin && (
              <Field label="Měna mzdy">
                <select name="salaryCurrency" defaultValue={employee?.salary_currency || 'CZK'} className={selectClass}>
                  <option value="CZK">CZK</option><option value="EUR">EUR</option><option value="USD">USD</option>
                </select>
              </Field>
            )}
            <Field label="Stav">
              <select name="status" defaultValue={employee?.status || 'active'} className={selectClass}>
                <option value="active">Aktivní</option><option value="terminated">Ukončeno</option>
              </select>
            </Field>
          </div>
          <Field label="Poznámka"><Input name="notes" defaultValue={employee?.notes || ''} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="lg" onClick={onClose}>Zrušit</Button>
            <Button type="submit" size="lg" disabled={pending}>{pending ? 'Ukládám…' : isEdit ? 'Uložit' : 'Přidat'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DepartmentsDialog({ departments, onClose }: { departments: Dept[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim(); if (!n) return
    const fd = new FormData(); fd.set('name', n)
    startTransition(async () => {
      const res = await createDepartment(fd)
      if (res?.error) { toast.error('Chyba', res.error); return }
      setName(''); toast.success('Oddělení přidáno')
    })
  }

  async function remove(d: Dept) {
    const ok = await confirmDialog({ title: `Smazat oddělení „${d.name}"?`, confirmLabel: 'Smazat', destructive: true })
    if (!ok) return
    startTransition(async () => {
      const res = await deleteDepartment(d.id)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Oddělení smazáno')
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Oddělení</DialogTitle>
          <DialogDescription>Spravujte oddělení vaší firmy.</DialogDescription>
        </DialogHeader>
        <form onSubmit={add} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Název oddělení" />
          <Button type="submit" size="lg" disabled={pending}>Přidat</Button>
        </form>
        <div className="space-y-1">
          {departments.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Zatím žádná oddělení.</p>
          ) : (
            departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm">
                <span className="text-foreground">{d.name}</span>
                <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" disabled={pending} onClick={() => remove(d)}><Trash2 className="size-4" /></Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
