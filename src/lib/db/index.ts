import 'server-only'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

// Serverless-safe singleton: Next.js dev HMR and route-handler cold starts
// would otherwise spawn a new pg.Pool per reload/request, exhausting Neon's
// connection limit. Cache the pool (and the drizzle instance) on globalThis.
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined
}

const pool =
  global.__dbPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') global.__dbPool = pool

export const db = drizzle(pool, { schema })
export { schema }
