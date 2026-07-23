import { createClient } from '@supabase/supabase-js'

// Klient je zatím záměrně NETYPOVANÝ (schema `any`). Reálné DB typy existují
// v @/types/database.types (Tables<>, TablesInsert<>) a doménová vrstva je
// přebírá postupně (Fáze 3) — hromadné otypování klienta = big-bang (~110 chyb),
// viz docs/adr/0002. Netypovaný klient drží zpětnou kompatibilitu call-sites.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
