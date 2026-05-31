'use client'

import { useState, useTransition } from 'react'
import {
  Users, Shield, Plus, Trash2, Edit2, Check, UserPlus,
  LayoutDashboard, FileText, DollarSign, Calendar, Briefcase, Building2, Mail, FolderOpen, Sparkles, User, Target,
} from 'lucide-react'
import {
  addTeamMember, removeTeamMember, createCustomRole, updateCustomRole,
  deleteCustomRole, assignCustomRole,
} from './actions'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { confirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/toast'

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  dashboard: LayoutDashboard, team: Users, invoices: FileText, finance: DollarSign, calendar: Calendar, hr: Briefcase, crm: Building2, mail: Mail, documents: FolderOpen, 'globaal-ai': Sparkles, personal: User, milestones: Target,
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrátor', manager: 'Manažer', employee: 'Zaměstnanec', external: 'Externista',
}
const ROLE_VARIANT: Record<string, 'default' | 'info' | 'secondary' | 'outline'> = {
  admin: 'default', manager: 'info', employee: 'secondary', external: 'outline',
}

const selectClass =
  'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50'

type CustomRole = { id: string; name: string; description?: string; color: string; modules: string[] }
type Member = { user_id: string; role: string; custom_role_id?: string; profiles?: { username?: string; full_name?: string } | null }

export function TeamClient({ members, customRoles: initialRoles, currentUserId, currentUserRole }: {
  members: Member[]
  customRoles: CustomRole[]
  currentUserId: string
  currentUserRole: string
}) {
  const [tab, setTab] = useState<'members' | 'roles'>('members')
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(initialRoles)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [isPending, startTransition] = useTransition()
  const isAdmin = currentUserRole === 'admin'

  const [memberForm, setMemberForm] = useState({ username: '', fullName: '', role: 'employee', customRoleId: 'none', password: '' })
  const emptyRole = { name: '', description: '', color: '#6366f1', modules: ['dashboard'] as string[] }
  const [roleForm, setRoleForm] = useState(emptyRole)

  function toggleModule(mod: string) {
    setRoleForm((f) => ({
      ...f,
      modules: f.modules.includes(mod) ? f.modules.filter((m) => m !== mod) : [...f.modules, mod],
    }))
  }

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(memberForm).forEach(([k, v]) => fd.set(k, v))
    startTransition(async () => {
      const res = await addTeamMember(fd)
      if (res?.error) {
        toast.error('Nepodařilo se přidat člena', res.error)
        return
      }
      toast.success('Člen přidán')
      setShowAddMember(false)
      setMemberForm({ username: '', fullName: '', role: 'employee', customRoleId: 'none', password: '' })
    })
  }

  function submitRole(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('name', roleForm.name)
    fd.set('description', roleForm.description)
    fd.set('color', roleForm.color)
    roleForm.modules.forEach((m) => fd.append('modules', m))
    startTransition(async () => {
      try {
        if (editingRole) {
          await updateCustomRole(editingRole.id, fd)
          setCustomRoles((prev) => prev.map((r) => (r.id === editingRole.id ? { ...r, ...roleForm } : r)))
          toast.success('Role uložena')
        } else {
          await createCustomRole(fd)
          setCustomRoles((prev) => [...prev, { id: `tmp-${prev.length}`, ...roleForm }])
          toast.success('Role vytvořena')
        }
        setEditingRole(null)
        setShowAddRole(false)
        setRoleForm(emptyRole)
      } catch (e: any) {
        toast.error('Chyba', e?.message)
      }
    })
  }

  async function handleDeleteRole(role: CustomRole) {
    const ok = await confirmDialog({
      title: `Smazat roli „${role.name}"?`,
      description: 'Členové s touto rolí přijdou o její přiřazení.',
      confirmLabel: 'Smazat',
      destructive: true,
    })
    if (!ok) return
    startTransition(async () => {
      try {
        await deleteCustomRole(role.id)
        setCustomRoles((prev) => prev.filter((r) => r.id !== role.id))
        toast.success('Role smazána')
      } catch (e: any) {
        toast.error('Chyba', e?.message)
      }
    })
  }

  async function handleRemoveMember(m: Member, name: string) {
    const ok = await confirmDialog({
      title: `Odebrat ${name}?`,
      description: 'Uživatel ztratí přístup do systému. Tuto akci nelze vrátit.',
      confirmLabel: 'Odebrat',
      destructive: true,
    })
    if (!ok) return
    startTransition(async () => {
      try {
        await removeTeamMember(m.user_id)
        toast.success('Člen odebrán')
      } catch (e: any) {
        toast.error('Chyba', e?.message)
      }
    })
  }

  function handleAssignRole(userId: string, value: string) {
    startTransition(async () => {
      try {
        await assignCustomRole(userId, value === 'none' ? null : value)
        toast.success('Role aktualizována')
      } catch (e: any) {
        toast.error('Chyba', e?.message)
      }
    })
  }

  function startEditRole(role: CustomRole) {
    setEditingRole(role)
    setRoleForm({ name: role.name, description: role.description || '', color: role.color, modules: role.modules })
    setShowAddRole(false)
  }

  const tabs = [
    { key: 'members', icon: Users, label: 'Členové' },
    { key: 'roles', icon: Shield, label: 'Role & Přístupy' },
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader title="Správa týmu" description={`${members.length} členů · ${customRoles.length} vlastních rolí`}>
        {isAdmin && (
          <Button size="lg" onClick={() => (tab === 'members' ? setShowAddMember(true) : setShowAddRole(true))}>
            <Plus className="size-4" />
            {tab === 'members' ? 'Přidat člena' : 'Nová role'}
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── MEMBERS ── */}
      {tab === 'members' && (
        <div className="space-y-4">
          {showAddMember && isAdmin && (
            <form onSubmit={handleAddMember} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
              <h3 className="flex items-center gap-2 font-medium text-foreground">
                <UserPlus className="size-4 text-primary" /> Nový člen
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Uživatelské jméno">
                  <Input required value={memberForm.username} onChange={(e) => setMemberForm((f) => ({ ...f, username: e.target.value }))} placeholder="jan.novak" />
                </Field>
                <Field label="Celé jméno">
                  <Input required value={memberForm.fullName} onChange={(e) => setMemberForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Jan Novák" />
                </Field>
                <Field label="Systémová role">
                  <select className={cn(selectClass, 'w-full')} value={memberForm.role} onChange={(e) => setMemberForm((f) => ({ ...f, role: e.target.value }))}>
                    {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Vlastní role (volitelné)">
                  <select className={cn(selectClass, 'w-full')} value={memberForm.customRoleId} onChange={(e) => setMemberForm((f) => ({ ...f, customRoleId: e.target.value }))}>
                    <option value="none">— žádná —</option>
                    {customRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Field>
                <Field label="Heslo" className="sm:col-span-2">
                  <Input required type="password" minLength={8} value={memberForm.password} onChange={(e) => setMemberForm((f) => ({ ...f, password: e.target.value }))} placeholder="min. 8 znaků" />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="lg" onClick={() => setShowAddMember(false)}>Zrušit</Button>
                <Button type="submit" size="lg" disabled={isPending}>{isPending ? 'Přidávám…' : 'Přidat'}</Button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {members.length === 0 ? (
              <EmptyState icon={Users} title="Žádní členové" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Člen</TableHead>
                    <TableHead>Systémová role</TableHead>
                    <TableHead>Vlastní role</TableHead>
                    <TableHead>Moduly</TableHead>
                    {isAdmin && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const profile = m.profiles as any
                    const name = profile?.full_name || profile?.username || m.user_id.slice(0, 8)
                    const username = profile?.username || ''
                    const customRole = customRoles.find((r) => r.id === m.custom_role_id)
                    const moduleIds = customRole?.modules || []
                    return (
                      <TableRow key={m.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={name} color={customRole?.color} />
                            <div>
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                {name}
                                {m.user_id === currentUserId && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Vy</Badge>}
                              </div>
                              {username && <div className="text-xs text-muted-foreground">@{username}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ROLE_VARIANT[m.role] ?? 'secondary'}>{ROLE_LABELS[m.role] || m.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <select
                              className={selectClass}
                              value={m.custom_role_id || 'none'}
                              onChange={(e) => handleAssignRole(m.user_id, e.target.value)}
                              disabled={isPending}
                            >
                              <option value="none">— žádná —</option>
                              {customRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                          ) : customRole ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: customRole.color }}>
                              {customRole.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {moduleIds.length ? (
                              moduleIds.map((mid) => {
                                const mod = MODULES.find((x) => x.id === mid)
                                return mod ? (
                                  <span key={mid} className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium" style={{ borderColor: mod.color + '55', color: mod.color, background: mod.color + '12' }}>
                                    {mod.label}
                                  </span>
                                ) : null
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground">Vše</span>
                            )}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {m.user_id !== currentUserId && (
                              <Button variant="ghost" size="icon-sm" aria-label={`Odebrat ${name}`} disabled={isPending} onClick={() => handleRemoveMember(m, name)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES ── */}
      {tab === 'roles' && (
        <div className="space-y-4">
          {(showAddRole || editingRole) && isAdmin && (
            <form onSubmit={submitRole} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
              <h3 className="flex items-center gap-2 font-medium text-foreground">
                <Shield className="size-4 text-primary" />
                {editingRole ? `Upravit roli: ${editingRole.name}` : 'Nová role'}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Název role">
                  <Input required value={roleForm.name} onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))} placeholder="např. Marketing" />
                </Field>
                <Field label="Barva">
                  <div className="flex items-center gap-2">
                    <input type="color" value={roleForm.color} onChange={(e) => setRoleForm((f) => ({ ...f, color: e.target.value }))} className="h-8 w-10 cursor-pointer rounded-lg border border-input bg-background p-1" />
                    <div className="ml-auto flex gap-1">
                      {['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#0ea5e9', '#f59e0b', '#ef4444'].map((c) => (
                        <button key={c} type="button" onClick={() => setRoleForm((f) => ({ ...f, color: c }))} className={cn('size-5 rounded-full border-2 transition-transform', roleForm.color === c ? 'scale-110 border-foreground' : 'border-transparent')} style={{ background: c }} aria-label={`Barva ${c}`} />
                      ))}
                    </div>
                  </div>
                </Field>
                <Field label="Popis (volitelné)" className="sm:col-span-2">
                  <Input value={roleForm.description} onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))} placeholder="Krátký popis role…" />
                </Field>
              </div>

              <div>
                <Label className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Povolené moduly</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {MODULES.map((mod) => {
                    const Icon = MODULE_ICONS[mod.id]
                    const active = roleForm.modules.includes(mod.id)
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all',
                          active ? 'border-transparent' : 'border-border opacity-60 hover:opacity-100'
                        )}
                        style={active ? { borderColor: mod.color, background: mod.color + '12' } : undefined}
                      >
                        {active && <Check className="absolute right-1 top-1 size-3" style={{ color: mod.color }} />}
                        {Icon && <Icon className="size-5" style={active ? { color: mod.color } : undefined} />}
                        <span className="text-[11px] font-medium" style={active ? { color: mod.color } : undefined}>{mod.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {roleForm.modules.length === 0 ? '⚠️ Žádný modul není povolen' : `${roleForm.modules.length} z ${MODULES.length} modulů povoleno`}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="lg" onClick={() => { setShowAddRole(false); setEditingRole(null); setRoleForm(emptyRole) }}>Zrušit</Button>
                <Button type="submit" size="lg" disabled={isPending || roleForm.modules.length === 0}>{isPending ? 'Ukládám…' : editingRole ? 'Uložit' : 'Vytvořit roli'}</Button>
              </div>
            </form>
          )}

          {customRoles.length === 0 && !showAddRole ? (
            <div className="rounded-xl border border-border bg-card shadow-xs">
              <EmptyState
                icon={Shield}
                title="Zatím žádné vlastní role"
                description="Vytvořte roli (např. Marketing) a určete, ke kterým modulům má přístup."
                action={isAdmin ? <Button size="lg" onClick={() => setShowAddRole(true)}><Plus className="size-4" />Vytvořit první roli</Button> : undefined}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {customRoles.map((role) => {
                const assigned = members.filter((m) => m.custom_role_id === role.id).length
                return (
                  <div key={role.id} className="group rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: role.color + '1f', border: `1px solid ${role.color}40` }}>
                          <Shield className="size-5" style={{ color: role.color }} />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{role.name}</div>
                          {role.description && <div className="text-xs text-muted-foreground">{role.description}</div>}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon-sm" aria-label="Upravit" onClick={() => startEditRole(role)}><Edit2 className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Smazat" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteRole(role)}><Trash2 className="size-3.5" /></Button>
                        </div>
                      )}
                    </div>
                    <div className="mb-4 flex flex-wrap gap-1">
                      {MODULES.map((mod) => {
                        const enabled = role.modules.includes(mod.id)
                        const Icon = MODULE_ICONS[mod.id]
                        return (
                          <span key={mod.id} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', enabled ? 'text-white' : 'bg-muted text-muted-foreground')} style={enabled ? { background: mod.color } : undefined}>
                            {Icon && <Icon className="size-2.5" />}{mod.label}
                          </span>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Users className="size-3" />{assigned} {assigned === 1 ? 'člen' : assigned >= 2 && assigned <= 4 ? 'členové' : 'členů'}</span>
                      <span className="rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums" style={{ background: role.color + '1f', color: role.color }}>{role.modules.length}/{MODULES.length}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
