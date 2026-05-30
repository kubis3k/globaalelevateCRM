// Apply a SQL migration file to a Postgres/Supabase database.
//
// Usage:
//   DATABASE_URL="postgresql://...:5432/postgres" node scripts/apply-migration.mjs supabase/migrations/20240531000000_custom_roles.sql
//
// The connection string is read from the DATABASE_URL env var and is NEVER committed.
// Get it from Supabase: Project Settings → Database → Connection string (URI).
import { readFileSync } from 'node:fs'
import pg from 'pg'

const sqlPath = process.argv[2]
if (!sqlPath) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql-file>')
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DATABASE_URL environment variable (Supabase → Settings → Database → Connection string).')
  process.exit(1)
}

const sql = readFileSync(sqlPath, 'utf8')
const client = new pg.Client({
  connectionString,
  // Supabase requires SSL; the managed cert chain is not always locally trusted.
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log(`✅ Applied migration: ${sqlPath}`)
} catch (err) {
  console.error(`❌ Migration failed: ${err.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
