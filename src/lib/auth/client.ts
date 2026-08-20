import { createAuthClient } from 'better-auth/react'

// Nahrazuje `src/lib/supabase/client.ts` (browser auth). Session cookie
// spravuje better-auth samo (HttpOnly), tento klient jen volá /api/auth/*.
export const authClient = createAuthClient()
