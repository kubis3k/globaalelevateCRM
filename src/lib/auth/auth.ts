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
    // Explicit key aliasing (user -> our `users` table) in addition to the
    // modelName override below — belt-and-suspenders, since drizzleAdapter's
    // schema-key resolution vs. the modelName override isn't fully clear
    // without a local compiler/runtime to verify against.
    schema: { ...schema, user: schema.users },
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
  // Appka běží na 3 vlastních doménách (work/jobs/klient.globaalelevate.com) + Vercel preview
  // aliasy — baseURL sám o sobě pokrývá jen jednu (VERCEL_URL je navíc per-deployment, ne stabilní).
  // Bez trustedOrigins better-auth při jakémkoli AUTHENTICATED requestu (cookie už existuje, viz
  // origin-check middleware) odmítne Origin header s FORBIDDEN/INVALID_ORIGIN — sign-in samotný to
  // nechytí (žádná cookie ještě není), proto vypadal cutover funkční, ale např. changePassword
  // (poslal cookie) padal na "Invalid origin".
  trustedOrigins: [
    'https://work.globaalelevate.com',
    'https://jobs.globaalelevate.com',
    'https://klient.globaalelevate.com',
    'https://*.vercel.app',
  ],
  plugins: [nextCookies()], // musí být poslední — zajistí Set-Cookie ze server actions
})
