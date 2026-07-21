'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const username = formData.get('username') as string
  const password = formData.get('password') as string

  // Interní staff používá jméno → @globaalelevate.com (workaround). Klienti
  // portálu se pozvou na reálný e-mail (viz /invite), takže se přihlašují
  // jím přímo — pozná se podle přítomnosti '@'.
  const email = username.includes('@') ? username : `${username}@globaalelevate.com`

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=InvalidCredentials')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
