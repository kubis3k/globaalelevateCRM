import { requireModuleAccess } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { PageHeader } from '@/components/ui/page-header'
import { canManageSocial } from '@/lib/permissions'
import { SocialClient } from './social-client'

export default async function SocialPage() {
  const { supabase, tenantId, role } = await requireModuleAccess('social')
  if (!tenantId) return <NoTenantView />

  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()

  const [accRes, metRes, postRes, docRes] = await Promise.all([
    supabase.from('social_accounts')
      .select('id, platform, handle, display_name, profile_url, followers, following, posts_count, auto_sync, last_synced_at')
      .eq('tenant_id', tenantId).order('followers', { ascending: false }),
    supabase.from('social_metrics')
      .select('account_id, followers, captured_at')
      .eq('tenant_id', tenantId).gte('captured_at', since).order('captured_at', { ascending: true }),
    supabase.from('social_posts')
      .select('id, content, media_doc_id, media_name, platforms, status, scheduled_at, published_at')
      .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200),
    supabase.from('documents')
      .select('id, name, mime_type').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200),
  ])

  const accounts = accRes.data ?? []
  const posts = postRes.data ?? []

  // Group follower-count snapshots per account → growth sparkline series.
  const series: Record<string, { t: number; f: number }[]> = {}
  for (const m of metRes.data ?? []) {
    const k = (m as any).account_id as string
    ;(series[k] ||= []).push({ t: new Date((m as any).captured_at).getTime(), f: Number((m as any).followers || 0) })
  }

  const documents = (docRes.data ?? [])
    .map((d: any) => ({ id: d.id, name: d.name, kind: String(d.mime_type || '').startsWith('video') ? 'video' : 'image', mime: d.mime_type }))
    .filter((d: any) => String(d.mime || '').startsWith('image') || String(d.mime || '').startsWith('video'))
    .map(({ id, name, kind }: any) => ({ id, name, kind }))

  return (
    <div className="space-y-6">
      <PageHeader title="Sociální sítě" description="Připojené profily, sledování růstu a plánování příspěvků na všechny sítě." />
      <SocialClient
        accounts={accounts as any}
        series={series}
        posts={posts as any}
        documents={documents as any}
        canManage={canManageSocial(role)}
      />
    </div>
  )
}
