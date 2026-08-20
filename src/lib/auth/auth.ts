import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { db, schema } from '@/lib/db'

// Nahrazuje Supabase Auth. Uživatelé zůstávají v tabulce `public.users`
// (stejná UUID jako dřív auth.users — desítky FK na ně odkazují), proto
// modelName mapping místo nové tabulky `user`.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  user: {
    modelName: 'users',
  },
  session: {
    modelName: 'session',
  },
  account: {
    modelName: 'account',
  },
  verification: {
    modelName: 'verification',
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  plugins: [nextCookies()], // musí být poslední — zajistí Set-Cookie ze server actions
})
