import { createBrowserClient } from '@supabase/ssr'

// Netypovaný klient (viz admin.ts). Doménové otypování probíhá po částech.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
