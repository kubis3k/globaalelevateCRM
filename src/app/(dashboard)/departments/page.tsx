import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Network } from 'lucide-react'
import { DepartmentsClient } from './departments-client'

export default async function DepartmentsPage() {
  const ctx = await requireModuleAccess('departments')
  const { supabase, tenantId, user, role } = ctx
  if (!tenantId) return <NoTenantView />

  const isManagement = role === 'admin' || role === 'manager'

  const [{ data: departments }, { data: employees }, { data: me }] = await Promise.all([
    supabase.from('hr_departments').select('id, name').eq('tenant_id', tenantId).order('name'),
    supabase.from('hr_employees').select('user_id, full_name, department_id, position, status').eq('tenant_id', tenantId).eq('status', 'active'),
    supabase.from('hr_employees').select('department_id').eq('tenant_id', tenantId).eq('user_id', user.id).maybeSingle(),
  ])

  // Zaměstnanec vidí jen své oddělení; management všechna.
  const visible = (departments ?? []).filter((d: any) => isManagement || d.id === me?.department_id)

  if (!visible.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Oddělení" description="Chat a úkoly vašeho oddělení." />
        <EmptyState
          icon={Network}
          title={isManagement ? 'Žádná oddělení' : 'Nejste zařazen/a do oddělení'}
          description={isManagement ? 'Vytvořte oddělení v modulu HR → Zaměstnanci.' : 'Požádejte manažera o zařazení do oddělení v HR.'}
        />
      </div>
    )
  }

  const deptIds = visible.map((d: any) => d.id)
  const [{ data: messages }, { data: tasks }] = await Promise.all([
    supabase.from('department_messages').select('*').eq('tenant_id', tenantId).in('department_id', deptIds)
      .order('created_at', { ascending: false }).limit(400),
    supabase.from('department_tasks').select('*').eq('tenant_id', tenantId).in('department_id', deptIds)
      .order('done', { ascending: true }).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
  ])

  // Jména: hr_employees.full_name, fallback profiles.
  const userIds = new Set<string>()
  for (const m of messages ?? []) userIds.add(m.user_id)
  for (const t of tasks ?? []) { if (t.assigned_to) userIds.add(t.assigned_to); if (t.created_by) userIds.add(t.created_by) }
  for (const e of employees ?? []) userIds.add(e.user_id)
  const ids = [...userIds]
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', ids)
    : { data: [] as any[] }
  const names: Record<string, string> = {}
  for (const id of ids) {
    const emp = (employees ?? []).find((e: any) => e.user_id === id)
    const p = (profiles ?? []).find((x: any) => x.id === id)
    names[id] = emp?.full_name || p?.full_name || p?.username || id.slice(0, 8)
  }

  return (
    <DepartmentsClient
      departments={visible}
      employees={(employees ?? []).map((e: any) => ({ user_id: e.user_id, name: names[e.user_id], department_id: e.department_id, position: e.position }))}
      messages={(messages ?? []).map((m: any) => ({ ...m, author: names[m.user_id] }))}
      tasks={(tasks ?? []).map((t: any) => ({ ...t, assignee: t.assigned_to ? names[t.assigned_to] : null, creator: t.created_by ? names[t.created_by] : null }))}
      currentUserId={user.id}
      defaultDepartmentId={me?.department_id && deptIds.includes(me.department_id) ? me.department_id : visible[0].id}
      isManagement={isManagement}
    />
  )
}
