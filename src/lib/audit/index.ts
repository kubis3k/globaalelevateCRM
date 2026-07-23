import 'server-only'

// Zápis citlivé akce do audit_log. Best-effort — NIKDY nesmí shodit samotnou
// mutaci (chyba se jen zaloguje). Volá se se service-role admin klientem.
export type AuditInput = {
  tenantId: string
  userId: string | null
  action: string          // 'doména.entita.akce', např. 'finance.transaction.delete'
  entity?: string | null
  entityId?: string | null
  summary?: string | null
  meta?: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordAudit(admin: any, input: AuditInput): Promise<void> {
  try {
    await admin.from('audit_log').insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      summary: input.summary ?? null,
      meta: input.meta ?? {},
    })
  } catch (e) {
    console.error('[audit] zápis selhal:', (e as Error)?.message || e)
  }
}
