'use server'

import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { getAuthContext, isAuthError } from '@/lib/auth/context'

export async function clearMustChangePassword() {
  const ctx = await getAuthContext()
  if (isAuthError(ctx)) return { error: ctx.error }
  await db.update(schema.users).set({ mustChangePassword: false }).where(eq(schema.users.id, ctx.userId))
  return {}
}
