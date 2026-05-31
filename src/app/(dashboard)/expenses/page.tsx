import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { ExpensesClient } from './expenses-client'

export default async function ExpensesPage() {
  const { supabase, tenantId, role, user } = await requireModuleAccess('expenses')
  if (!tenantId) return <NoTenantView />

  const { data: claims } = await supabase.from('expense_claims').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
  const ids = [...new Set((claims ?? []).map((c: any) => c.user_id).filter(Boolean))]
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name').in('id', ids) : { data: [] as any[] }
  const nameOf = (uid: string | null) => { if (!uid) return null; const p = (profiles ?? []).find((x: any) => x.id === uid); return p?.full_name || p?.username || null }

  const claimsFull = (claims ?? []).map((c: any) => ({ ...c, claimant_name: nameOf(c.user_id) }))
  const canReview = role === 'admin' || role === 'manager'

  return (
    <div className="space-y-6">
      <PageHeader title="Výdaje" description="Výdaje zaměstnanců k proplacení. Schválený výdaj se zapíše do financí." />
      <ExpensesClient claims={claimsFull} canReview={canReview} currentUserId={user.id} />
    </div>
  )
}
