import 'server-only'
import { canManageHr } from '@/lib/permissions'

// Custom (company-data) tools for Globaal AI. Each tool is gated by the calling
// user's module access, so the AI can only read what the user could read in the
// UI. Executors run with the service-role client, tenant-scoped.

export type AiToolCtx = { admin: any; tenantId: string; userId: string; role: string; allowedModules: string[] }
type ToolDef = { name: string; description: string; input_schema: any }

export function companyTools(allowed: string[], role: string): ToolDef[] {
  const tools: ToolDef[] = []
  const has = (m: string) => allowed.includes(m)

  if (has('crm')) {
    tools.push({
      name: 'search_clients',
      description: 'Vyhledá klienty/firmy v CRM podle názvu (bez dotazu vrátí poslední). Vrací název, IČO, e-mail, telefon, stav a poznámku.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Část názvu klienta; volitelné' } } },
    })
    tools.push({
      name: 'list_crm_activities',
      description: 'Vrátí CRM aktivity/úkoly (předmět, typ, termín, hotovo). Lze omezit jen na nedokončené.',
      input_schema: { type: 'object', properties: { only_open: { type: 'boolean', description: 'Jen nedokončené úkoly' } } },
    })
  }
  if (has('finance') || has('invoices')) {
    tools.push({
      name: 'get_finance_data',
      description: 'Vrátí poslední faktury a finanční transakce firmy. Z dat si spočítej tržby, náklady a stav.',
      input_schema: { type: 'object', properties: {} },
    })
  }
  if (has('hr') && canManageHr(role)) {
    tools.push({
      name: 'get_hr_data',
      description: 'Vrátí zaměstnance a žádosti o dovolenou (citlivé HR údaje — jen pro management).',
      input_schema: { type: 'object', properties: {} },
    })
  }
  if (has('calendar')) {
    tools.push({
      name: 'get_calendar',
      description: 'Vrátí nadcházející události v kalendáři firmy (název, čas od/do, komu přiřazeno).',
      input_schema: { type: 'object', properties: {} },
    })
  }
  if (has('documents')) {
    tools.push({
      name: 'search_documents',
      description: 'Vyhledá dokumenty v knihovně podle názvu (bez dotazu vrátí poslední). Vrací název, kategorii a zdroj.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Část názvu dokumentu; volitelné' } } },
    })
  }
  if (has('milestones')) {
    tools.push({
      name: 'get_company_goals',
      description: 'Vrátí firemní cíle (milníky) na týden/měsíc/rok s pokrokem v %. Jen aktivní (nearchivované).',
      input_schema: { type: 'object', properties: {} },
    })
  }
  if (has('personal')) {
    tools.push({
      name: 'get_personal_goals',
      description: 'Vrátí osobní cíle přihlášeného uživatele (týden/měsíc/rok) s pokrokem. Soukromé — jen jeho.',
      input_schema: { type: 'object', properties: {} },
    })
  }
  if (has('projects')) {
    tools.push({
      name: 'list_projects',
      description: 'Vrátí projekty/zakázky firmy se stavem, klientem, termínem, rozpočtem a počtem úkolů (hotové/otevřené). Pro dotazy na rozpracovanost zakázek a co je potřeba dořešit.',
      input_schema: { type: 'object', properties: { only_active: { type: 'boolean', description: 'Jen aktivní/rozpracované projekty (planning, active, on_hold)' } } },
    })
  }
  if (has('time')) {
    tools.push({
      name: 'get_time_entries',
      description: 'Vrátí výkazy práce (odpracované hodiny) na projektech — datum, projekt, kdo, hodiny, fakturovatelnost. Z dat si spočítej součty a fakturovatelnou hodnotu.',
      input_schema: { type: 'object', properties: { only_billable: { type: 'boolean', description: 'Jen fakturovatelné záznamy' } } },
    })
  }
  if (has('quotes')) {
    tools.push({
      name: 'list_quotes',
      description: 'Vrátí cenové nabídky — číslo, klient, stav (draft/sent/accepted/rejected), platnost a celkovou částku vč. DPH. Pro dotazy na vystavené nabídky a jejich stav.',
      input_schema: { type: 'object', properties: { only_open: { type: 'boolean', description: 'Jen nevyřízené nabídky (draft, sent)' } } },
    })
  }
  if (has('events')) {
    tools.push({
      name: 'list_events',
      description: 'Vrátí akce/eventy — datum, místo, kapacita, stav, rozpočet, klient, line-up (umělci) + součet honorářů, počet VIP rezervací a jejich min. útrata, počet hostů. Pro dotazy na nadcházející akce, obsazení a rozpočty eventů.',
      input_schema: { type: 'object', properties: { upcoming_only: { type: 'boolean', description: 'Jen nadcházející akce (od dneška)' } } },
    })
  }
  return tools
}

const cap = (rows: any[] | null | undefined, n = 50) => (rows || []).slice(0, n)

export async function executeCompanyTool(ctx: AiToolCtx, name: string, input: any): Promise<string> {
  const { admin, tenantId } = ctx
  try {
    switch (name) {
      case 'search_clients': {
        let q = admin.from('crm_clients').select('name, ico, dic, email, phone, status, note, created_at').eq('tenant_id', tenantId)
        if (input?.query) q = q.ilike('name', `%${input.query}%`)
        const { data } = await q.order('created_at', { ascending: false }).limit(50)
        return JSON.stringify(cap(data))
      }
      case 'list_crm_activities': {
        let q = admin.from('crm_activities').select('subject, type, content, due_date, done, created_at').eq('tenant_id', tenantId)
        if (input?.only_open) q = q.eq('done', false)
        const { data } = await q.order('due_date', { ascending: true }).limit(50)
        return JSON.stringify(cap(data))
      }
      case 'get_finance_data': {
        const { data: invoices } = await admin.from('invoices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50)
        const { data: tx } = await admin.from('transactions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50)
        return JSON.stringify({ invoices: cap(invoices), transactions: cap(tx) })
      }
      case 'get_hr_data': {
        const { data: employees } = await admin.from('hr_employees').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(60)
        const { data: leave } = await admin.from('hr_leave_requests').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50)
        return JSON.stringify({ employees: cap(employees, 60), leave_requests: cap(leave) })
      }
      case 'get_calendar': {
        const now = new Date().toISOString()
        const { data } = await admin.from('calendar_events')
          .select('title, description, start_time, end_time, assigned_to, assigned_role')
          .eq('tenant_id', tenantId).gte('start_time', now).order('start_time', { ascending: true }).limit(50)
        return JSON.stringify(cap(data))
      }
      case 'search_documents': {
        let q = admin.from('documents').select('name, category, source, source_ref, created_at').eq('tenant_id', tenantId)
        if (input?.query) q = q.ilike('name', `%${input.query}%`)
        const { data } = await q.order('created_at', { ascending: false }).limit(50)
        return JSON.stringify(cap(data))
      }
      case 'get_company_goals': {
        const { data } = await admin.from('milestones')
          .select('title, description, timeframe, target_date, progress')
          .eq('tenant_id', tenantId).eq('archived', false).limit(100)
        return JSON.stringify(cap(data, 100))
      }
      case 'get_personal_goals': {
        const { data } = await admin.from('personal_goals')
          .select('title, description, timeframe, target_date, progress')
          .eq('user_id', ctx.userId).eq('archived', false).limit(100)
        return JSON.stringify(cap(data, 100))
      }
      case 'list_projects': {
        let q = admin.from('projects')
          .select('id, name, status, priority, client_id, due_date, budget, currency, created_at')
          .eq('tenant_id', tenantId)
        if (input?.only_active) q = q.in('status', ['planning', 'active', 'on_hold'])
        const { data: projects } = await q.order('created_at', { ascending: false }).limit(50)
        const list = projects || []
        const projectIds = list.map((p: any) => p.id)
        const clientIds = [...new Set(list.map((p: any) => p.client_id).filter(Boolean))]
        const [{ data: tasks }, { data: clients }] = await Promise.all([
          projectIds.length ? admin.from('project_tasks').select('project_id, status').in('project_id', projectIds) : Promise.resolve({ data: [] as any[] }),
          clientIds.length ? admin.from('crm_clients').select('id, name').in('id', clientIds) : Promise.resolve({ data: [] as any[] }),
        ])
        const out = list.map((p: any) => {
          const pts = (tasks || []).filter((t: any) => t.project_id === p.id)
          const done = pts.filter((t: any) => t.status === 'done').length
          return {
            name: p.name, status: p.status, priority: p.priority,
            client: (clients || []).find((c: any) => c.id === p.client_id)?.name || null,
            due_date: p.due_date, budget: p.budget, currency: p.currency,
            tasks_total: pts.length, tasks_done: done, tasks_open: pts.length - done,
          }
        })
        return JSON.stringify(cap(out))
      }
      case 'get_time_entries': {
        let q = admin.from('time_entries')
          .select('work_date, minutes, billable, hourly_rate, currency, project_id, user_id, description')
          .eq('tenant_id', tenantId)
        if (input?.only_billable) q = q.eq('billable', true)
        const { data: entries } = await q.order('work_date', { ascending: false }).limit(50)
        const list = entries || []
        const projectIds = [...new Set(list.map((e: any) => e.project_id).filter(Boolean))]
        const userIds = [...new Set(list.map((e: any) => e.user_id).filter(Boolean))]
        const [{ data: projects }, { data: profiles }] = await Promise.all([
          projectIds.length ? admin.from('projects').select('id, name').in('id', projectIds) : Promise.resolve({ data: [] as any[] }),
          userIds.length ? admin.from('profiles').select('id, username, full_name').in('id', userIds) : Promise.resolve({ data: [] as any[] }),
        ])
        const out = list.map((e: any) => {
          const p = (profiles || []).find((x: any) => x.id === e.user_id)
          return {
            date: e.work_date, hours: Math.round((e.minutes / 60) * 100) / 100, billable: e.billable,
            project: (projects || []).find((x: any) => x.id === e.project_id)?.name || null,
            person: p?.full_name || p?.username || null, description: e.description,
          }
        })
        return JSON.stringify(cap(out))
      }
      case 'list_quotes': {
        let q = admin.from('quotes')
          .select('number, client_name, status, issue_date, valid_until, subtotal, vat_total, total, currency')
          .eq('tenant_id', tenantId)
        if (input?.only_open) q = q.in('status', ['draft', 'sent'])
        const { data } = await q.order('created_at', { ascending: false }).limit(50)
        return JSON.stringify(cap(data))
      }
      case 'list_events': {
        let q = admin.from('events').select('id, name, event_date, location, capacity, status, budget, client').eq('tenant_id', tenantId)
        if (input?.upcoming_only) q = q.gte('event_date', new Date().toISOString().slice(0, 10))
        const { data: events } = await q.order('event_date', { ascending: false }).limit(50)
        const list = events || []
        const ids = list.map((e: any) => e.id)
        const [{ data: lineup }, { data: vips }, { data: guests }] = await Promise.all([
          ids.length ? admin.from('event_lineup').select('event_id, artist, fee').in('event_id', ids) : Promise.resolve({ data: [] as any[] }),
          ids.length ? admin.from('vip_reservations').select('event_id, min_spend, status').in('event_id', ids) : Promise.resolve({ data: [] as any[] }),
          ids.length ? admin.from('guest_list').select('event_id, party_size').in('event_id', ids) : Promise.resolve({ data: [] as any[] }),
        ])
        const out = list.map((e: any) => {
          const ls = (lineup || []).filter((l: any) => l.event_id === e.id)
          const vs = (vips || []).filter((v: any) => v.event_id === e.id && v.status !== 'cancelled')
          return {
            name: e.name, date: e.event_date, location: e.location, capacity: e.capacity, status: e.status, budget: e.budget, client: e.client,
            lineup: ls.map((l: any) => l.artist), artist_fees: ls.reduce((a: number, l: any) => a + Number(l.fee || 0), 0),
            vip_reservations: vs.length, vip_min_spend: vs.reduce((a: number, v: any) => a + Number(v.min_spend || 0), 0),
            guests: (guests || []).filter((g: any) => g.event_id === e.id).reduce((a: number, g: any) => a + Number(g.party_size || 1), 0),
          }
        })
        return JSON.stringify(cap(out))
      }
      default:
        return `Neznámý nástroj: ${name}`
    }
  } catch (e: any) {
    return `Chyba při načítání dat (${name}): ${e?.message || 'neznámá chyba'}`
  }
}
