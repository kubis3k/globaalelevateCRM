import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Zjistíme, jestli je uživatel přihlášený
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')
  
  // Přesměrujeme zpět na login stránku
  return NextResponse.redirect(new URL('/login', req.url), {
    status: 302,
  })
}
