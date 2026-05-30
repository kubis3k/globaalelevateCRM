'use client'

import { useState, useTransition } from 'react'
import { Users, Shield, Plus, Trash2, Edit2, Check, X, LayoutDashboard, FileText, DollarSign, Calendar, UserPlus, ChevronDown } from 'lucide-react'
import { addTeamMember, removeTeamMember, createCustomRole, updateCustomRole, deleteCustomRole, assignCustomRole } from './actions'

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#6366f1' },
  { id: 'team',      label: 'Tým',        icon: Users,           color: '#8b5cf6' },
  { id: 'invoices',  label: 'Faktury',    icon: FileText,        color: '#0ea5e9' },
  { id: 'finance',   label: 'Finance',    icon: DollarSign,      color: '#10b981' },
  { id: 'calendar',  label: 'Kalendář',   icon: Calendar,        color: '#f59e0b' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrátor', manager: 'Manažer', employee: 'Zaměstnanec', external: 'Externista',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  manager: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  employee: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  external: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

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
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const isAdmin = currentUserRole === 'admin'

  // ─── Add Member Form State ─────────────────────────────────
  const [memberForm, setMemberForm] = useState({ username: '', fullName: '', role: 'employee', customRoleId: 'none', password: '' })

  // ─── Role Form State ───────────────────────────────────────
  const emptyRole = { name: '', description: '', color: '#6366f1', modules: ['dashboard'] as string[] }
  const [roleForm, setRoleForm] = useState(emptyRole)

  function toggleModule(mod: string) {
    setRoleForm(f => ({
      ...f,
      modules: f.modules.includes(mod) ? f.modules.filter(m => m !== mod) : [...f.modules, mod]
    }))
  }

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(memberForm).forEach(([k, v]) => fd.set(k === 'fullName' ? 'fullName' : k === 'customRoleId' ? 'customRoleId' : k, v))
    startTransition(async () => {
      try { await addTeamMember(fd); setShowAddMember(false); setMemberForm({ username: '', fullName: '', role: 'employee', customRoleId: 'none', password: '' }) }
      catch (e: any) { setError(e.message) }
    })
  }

  function handleCreateRole(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const fd = new FormData()
    fd.set('name', roleForm.name); fd.set('description', roleForm.description); fd.set('color', roleForm.color)
    roleForm.modules.forEach(m => fd.append('modules', m))
    startTransition(async () => {
      try {
        await createCustomRole(fd)
        setCustomRoles(prev => [...prev, { id: Date.now().toString(), ...roleForm }])
        setShowAddRole(false); setRoleForm(emptyRole)
      } catch (e: any) { setError(e.message) }
    })
  }

  function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault(); if (!editingRole) return; setError('')
    const fd = new FormData()
    fd.set('name', roleForm.name); fd.set('description', roleForm.description); fd.set('color', roleForm.color)
    roleForm.modules.forEach(m => fd.append('modules', m))
    startTransition(async () => {
      try {
        await updateCustomRole(editingRole.id, fd)
        setCustomRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, ...roleForm } : r))
        setEditingRole(null); setRoleForm(emptyRole)
      } catch (e: any) { setError(e.message) }
    })
  }

  function handleDeleteRole(id: string) {
    startTransition(async () => {
      try { await deleteCustomRole(id); setCustomRoles(prev => prev.filter(r => r.id !== id)) }
      catch (e: any) { setError(e.message) }
    })
  }

  function startEditRole(role: CustomRole) {
    setEditingRole(role)
    setRoleForm({ name: role.name, description: role.description || '', color: role.color, modules: role.modules })
    setShowAddRole(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Správa týmu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{members.length} členů • {customRoles.length} vlastních rolí</p>
        </div>
        {isAdmin && (
          <button onClick={() => tab === 'members' ? setShowAddMember(true) : setShowAddRole(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus className="h-4 w-4" />
            {tab === 'members' ? 'Přidat člena' : 'Nová role'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 w-fit">
        {([['members', Users, 'Členové'], ['roles', Shield, 'Role & Přístupy']] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ── MEMBERS TAB ── */}
      {tab === 'members' && (
        <div className="space-y-3">
          {showAddMember && isAdmin && (
            <form onSubmit={handleAddMember} className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><UserPlus className="h-4 w-4 text-indigo-500" /> Nový člen</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Uživatelské jméno</label>
                  <input required value={memberForm.username} onChange={e => setMemberForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="jan.novak" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Celé jméno</label>
                  <input required value={memberForm.fullName} onChange={e => setMemberForm(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Jan Novák" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Systémová role</label>
                  <select value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Vlastní role (volitelné)</label>
                  <select value={memberForm.customRoleId} onChange={e => setMemberForm(f => ({ ...f, customRoleId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="none">— žádná —</option>
                    {customRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Heslo</label>
                  <input required type="password" value={memberForm.password} onChange={e => setMemberForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="min. 8 znaků" minLength={8} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddMember(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Zrušit</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {isPending ? 'Přidávám…' : 'Přidat'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {['Člen', 'Systémová role', 'Vlastní role', 'Moduly', isAdmin ? 'Akce' : ''].map(h => h && (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.map(m => {
                  const profile = m.profiles as any
                  const name = profile?.full_name || profile?.username || m.user_id.slice(0, 8)
                  const username = profile?.username || ''
                  const customRole = customRoles.find(r => r.id === m.custom_role_id)
                  const modules = customRole?.modules || []
                  return (
                    <tr key={m.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: customRole?.color || '#6366f1' }}>
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{name}</div>
                            {username && <div className="text-xs text-muted-foreground">@{username}</div>}
                          </div>
                          {m.user_id === currentUserId && <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 px-1.5 py-0.5 rounded-md font-medium">Vy</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[m.role] || ROLE_COLORS.employee}`}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {customRole ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white" style={{ background: customRole.color }}>
                            {customRole.name}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {modules.length ? modules.map(mid => {
                            const mod = ALL_MODULES.find(m => m.id === mid)
                            return mod ? (
                              <span key={mid} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium border"
                                style={{ borderColor: mod.color + '60', color: mod.color, background: mod.color + '15' }}>
                                {mod.label}
                              </span>
                            ) : null
                          }) : <span className="text-xs text-muted-foreground">Vše</span>}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5">
                          {m.user_id !== currentUserId && (
                            <button onClick={() => { if (confirm(`Smazat ${name}?`)) startTransition(() => removeTeamMember(m.user_id).catch(e => setError(e.message))) }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {members.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">Žádní členové</div>}
          </div>
        </div>
      )}

      {/* ── ROLES TAB ── */}
      {tab === 'roles' && (
        <div className="space-y-4">
          {/* Role form */}
          {(showAddRole || editingRole) && isAdmin && (
            <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
              className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500" />
                {editingRole ? `Upravit roli: ${editingRole.name}` : 'Nová role'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Název role</label>
                  <input required value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="např. Marketing" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Barva</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={roleForm.color} onChange={e => setRoleForm(f => ({ ...f, color: e.target.value }))}
                      className="h-9 w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-background cursor-pointer p-1" />
                    <span className="text-xs text-muted-foreground font-mono">{roleForm.color}</span>
                    <div className="flex gap-1 ml-auto">
                      {['#6366f1','#8b5cf6','#ec4899','#10b981','#0ea5e9','#f59e0b','#ef4444'].map(c => (
                        <button key={c} type="button" onClick={() => setRoleForm(f => ({ ...f, color: c }))}
                          className={`h-5 w-5 rounded-full border-2 transition-all ${roleForm.color === c ? 'border-slate-900 dark:border-white scale-125' : 'border-transparent'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Popis (volitelné)</label>
                  <input value={roleForm.description} onChange={e => setRoleForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Krátký popis role…" />
                </div>
              </div>

              {/* Module toggles */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">Povolené moduly</label>
                <div className="grid grid-cols-5 gap-2">
                  {ALL_MODULES.map(mod => {
                    const Icon = mod.icon
                    const active = roleForm.modules.includes(mod.id)
                    return (
                      <button key={mod.id} type="button" onClick={() => toggleModule(mod.id)}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          active ? 'border-transparent shadow-md scale-105' : 'border-slate-200 dark:border-slate-700 opacity-50 hover:opacity-75'
                        }`}
                        style={active ? { borderColor: mod.color, background: mod.color + '15' } : {}}>
                        {active && <Check className="absolute top-1 right-1 h-3 w-3" style={{ color: mod.color }} />}
                        <Icon className="h-5 w-5" style={{ color: active ? mod.color : undefined }} />
                        <span className="text-[11px] font-medium" style={{ color: active ? mod.color : undefined }}>{mod.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {roleForm.modules.length === 0 ? '⚠️ Žádný modul není povolen' : `${roleForm.modules.length} z ${ALL_MODULES.length} modulů povoleno`}
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowAddRole(false); setEditingRole(null); setRoleForm(emptyRole) }}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Zrušit</button>
                <button type="submit" disabled={isPending || roleForm.modules.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {isPending ? 'Ukládám…' : editingRole ? 'Uložit' : 'Vytvořit roli'}
                </button>
              </div>
            </form>
          )}

          {/* Role cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customRoles.map(role => {
              const assignedCount = members.filter(m => m.custom_role_id === role.id).length
              return (
                <div key={role.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: role.color + '20', border: `2px solid ${role.color}40` }}>
                        <Shield className="h-5 w-5" style={{ color: role.color }} />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{role.name}</div>
                        {role.description && <div className="text-xs text-muted-foreground">{role.description}</div>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditRole(role)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm(`Smazat roli "${role.name}"?`)) handleDeleteRole(role.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>

                  {/* Module pills */}
                  <div className="flex gap-1 flex-wrap mb-4">
                    {ALL_MODULES.map(mod => {
                      const enabled = role.modules.includes(mod.id)
                      const Icon = mod.icon
                      return (
                        <span key={mod.id} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${enabled ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                          style={enabled ? { background: mod.color } : {}}>
                          <Icon className="h-2.5 w-2.5" />
                          {mod.label}
                        </span>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {assignedCount} {assignedCount === 1 ? 'člen' : assignedCount >= 2 && assignedCount <= 4 ? 'členové' : 'členů'}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: role.color + '20', color: role.color }}>
                      {role.modules.length}/{ALL_MODULES.length} modulů
                    </span>
                  </div>
                </div>
              )
            })}

            {customRoles.length === 0 && !showAddRole && (
              <div className="col-span-3 py-16 text-center">
                <Shield className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Zatím žádné vlastní role</p>
                {isAdmin && <button onClick={() => setShowAddRole(true)} className="mt-3 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">Vytvořit první roli →</button>}
              </div>
            )}
          </div>

          {/* Migration notice if table doesn't exist */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">⚠️ Před použitím spusťte migraci v Supabase</p>
            <p className="text-xs opacity-80">Dashboard → SQL Editor → vložte obsah souboru <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">supabase/migrations/20240531000000_custom_roles.sql</code></p>
          </div>
        </div>
      )}
    </div>
  )
}
