import 'server-only'
import {
  and, or as drizzleOr, not as drizzleNot, eq, ne, gt, gte, lt, lte, like, ilike,
  isNull, inArray, asc, desc, sql,
} from 'drizzle-orm'
import { db, schema } from './index'

// PostgREST-compatible shim: every existing `supabase.from(table)...` call
// site (675 of them, unchanged) keeps working against this instead of a
// real Supabase client, translating to Drizzle/Neon underneath. See
// docs/adr/ (Neon migration) — full rationale in .claude/state/flow-state.md.
//
// Row shape: schema.ts uses snake_case property keys 1:1 with SQL column
// names for every table here (Better-Auth's own tables are the one
// exception, camelCase to match its internal conventions) — so `row.tenant_id`
// keeps working exactly as before with zero column-name translation.

export type PgError = { message: string; code?: string } | null

function toCamel(snake: string): string {
  return snake.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
}

function resolveTable(name: string): any {
  const table = (schema as Record<string, any>)[toCamel(name)]
  if (!table) throw new Error(`pg-shim: unknown table "${name}" (no schema.${toCamel(name)})`)
  return table
}

function col(table: any, name: string): any {
  const c = table[name]
  if (!c) throw new Error(`pg-shim: unknown column "${name}" on table`)
  return c
}

function buildOpCondition(table: any, colName: string, op: string, val: any): any {
  const c = col(table, colName)
  switch (op) {
    case 'eq': return eq(c, val)
    case 'neq': return ne(c, val)
    case 'gt': return gt(c, val)
    case 'gte': return gte(c, val)
    case 'lt': return lt(c, val)
    case 'lte': return lte(c, val)
    case 'like': return like(c, val as string)
    case 'ilike': return ilike(c, val as string)
    case 'in': return inArray(c, val as any[])
    case 'is':
      if (val === null) return isNull(c)
      if (val === true) return sql`${c} IS TRUE`
      if (val === false) return sql`${c} IS FALSE`
      return eq(c, val)
    default:
      throw new Error(`pg-shim: unsupported operator "${op}"`)
  }
}

// Parses a single postgrest-style term "column.op.value" (used by .or()).
// value 'null'/'true'/'false' are coerced; everything else stays a string.
function parseOrTerm(table: any, term: string): any {
  const [colName, op, ...rest] = term.split('.')
  let raw: string = rest.join('.')
  let val: any = raw
  if (raw === 'null') val = null
  else if (raw === 'true') val = true
  else if (raw === 'false') val = false
  return buildOpCondition(table, colName, op, val)
}

function parseSelectCols(colsArg: string | undefined): string[] {
  if (!colsArg || colsArg.trim() === '*') return ['*']
  return colsArg.split(',').map((c) => c.trim()).filter(Boolean)
}

function buildReturning(table: any, cols: string[]): Record<string, any> | undefined {
  if (cols.length === 1 && cols[0] === '*') return undefined // undefined => drizzle .returning() = all columns
  const shape: Record<string, any> = {}
  for (const c of cols) shape[c] = col(table, c)
  return shape
}

type SelectOpts = { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }

class Query implements PromiseLike<{ data: any; error: PgError; count: number | null }> {
  private tableName: string
  private table: any
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: any
  private onConflictCols: string[] | null = null
  private conditions: any[] = []
  private orderBy: { col: string; ascending: boolean }[] = []
  private limitN: number | null = null
  private wantSingle: 'single' | 'maybeSingle' | null = null
  private returningCols: string[] = ['*']
  private selectOpts: SelectOpts = {}

  constructor(tableName: string) {
    this.tableName = tableName
    this.table = resolveTable(tableName)
  }

  select(cols?: string, opts?: SelectOpts) {
    this.returningCols = parseSelectCols(cols)
    if (opts) this.selectOpts = opts
    return this
  }
  insert(payload: any) { this.mode = 'insert'; this.payload = payload; return this }
  update(payload: any) { this.mode = 'update'; this.payload = payload; return this }
  upsert(payload: any, opts?: { onConflict?: string }) {
    this.mode = 'upsert'; this.payload = payload
    this.onConflictCols = opts?.onConflict ? opts.onConflict.split(',').map((s) => s.trim()) : ['id']
    return this
  }
  delete() { this.mode = 'delete'; return this }

  eq(c: string, v: any) { this.conditions.push(eq(col(this.table, c), v)); return this }
  neq(c: string, v: any) { this.conditions.push(ne(col(this.table, c), v)); return this }
  gt(c: string, v: any) { this.conditions.push(gt(col(this.table, c), v)); return this }
  gte(c: string, v: any) { this.conditions.push(gte(col(this.table, c), v)); return this }
  lt(c: string, v: any) { this.conditions.push(lt(col(this.table, c), v)); return this }
  lte(c: string, v: any) { this.conditions.push(lte(col(this.table, c), v)); return this }
  like(c: string, v: string) { this.conditions.push(like(col(this.table, c), v)); return this }
  ilike(c: string, v: string) { this.conditions.push(ilike(col(this.table, c), v)); return this }
  in(c: string, v: any[]) { this.conditions.push(inArray(col(this.table, c), v)); return this }
  is(c: string, v: any) { this.conditions.push(buildOpCondition(this.table, c, 'is', v)); return this }
  not(c: string, op: string, v: any) { this.conditions.push(drizzleNot(buildOpCondition(this.table, c, op, v))); return this }
  or(orString: string) {
    const parts = orString.split(',').map((t) => parseOrTerm(this.table, t))
    this.conditions.push(drizzleOr(...parts))
    return this
  }

  order(c: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ col: c, ascending: opts?.ascending !== false })
    return this
  }
  limit(n: number) { this.limitN = n; return this }
  single() { this.wantSingle = 'single'; return this }
  maybeSingle() { this.wantSingle = 'maybeSingle'; return this }

  private whereClause(): any {
    return this.conditions.length ? and(...this.conditions) : undefined
  }

  private async run(): Promise<{ data: any; error: PgError; count: number | null }> {
    try {
      const where = this.whereClause()

      if (this.mode === 'select') {
        if (this.selectOpts.count) {
          const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(this.table).where(where)
          if (this.selectOpts.head) return { data: null, error: null, count }
          // fall through to also fetch rows if head!=true (rare in this codebase, not used)
        }
        const shape = buildReturning(this.table, this.returningCols)
        let q: any = shape ? db.select(shape).from(this.table) : db.select().from(this.table)
        if (where) q = q.where(where)
        for (const o of this.orderBy) q = q.orderBy(o.ascending ? asc(col(this.table, o.col)) : desc(col(this.table, o.col)))
        if (this.limitN != null) q = q.limit(this.limitN)
        const rows = await q
        return this.finish(rows, null)
      }

      if (this.mode === 'insert') {
        const returning = buildReturning(this.table, this.returningCols)
        const q = db.insert(this.table).values(this.payload)
        const rows = returning ? await q.returning(returning) : await q.returning()
        return this.finish(rows, null)
      }

      if (this.mode === 'upsert') {
        const returning = buildReturning(this.table, this.returningCols)
        const target = this.onConflictCols!.map((c) => col(this.table, c))
        const rowsArr = Array.isArray(this.payload) ? this.payload : [this.payload]
        const setShape: Record<string, any> = {}
        for (const key of Object.keys(rowsArr[0])) setShape[key] = sql.raw(`excluded."${key}"`)
        const q = db.insert(this.table).values(this.payload).onConflictDoUpdate({ target, set: setShape })
        const rows = returning ? await q.returning(returning) : await q.returning()
        return this.finish(rows, null)
      }

      if (this.mode === 'update') {
        const returning = buildReturning(this.table, this.returningCols)
        let q: any = db.update(this.table).set(this.payload)
        if (where) q = q.where(where)
        const rows = returning ? await q.returning(returning) : await q.returning()
        return this.finish(rows, null)
      }

      if (this.mode === 'delete') {
        const returning = buildReturning(this.table, this.returningCols)
        let q: any = db.delete(this.table)
        if (where) q = q.where(where)
        const rows = returning ? await q.returning(returning) : await q.returning()
        return this.finish(rows, null)
      }

      throw new Error('pg-shim: unreachable mode')
    } catch (err: any) {
      const shaped = this.wantSingle ? null : (this.mode === 'select' ? [] : null)
      return { data: shaped, error: { message: err?.message ?? String(err), code: err?.code }, count: null }
    }
  }

  private finish(rows: any[], error: PgError): { data: any; error: PgError; count: number | null } {
    if (this.wantSingle === 'single') {
      if (rows.length === 0) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }, count: null }
      return { data: rows[0], error: null, count: null }
    }
    if (this.wantSingle === 'maybeSingle') {
      return { data: rows[0] ?? null, error: null, count: null }
    }
    return { data: rows, error, count: null }
  }

  then<TResult1 = { data: any; error: PgError; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: PgError; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected)
  }
}

export function from(tableName: string) {
  return new Query(tableName)
}
