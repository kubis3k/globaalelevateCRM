'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const username = formData.get('username') as string
  const password = formData.get('password') as string

  // Interní mapování uživatelského jména na email pro Supabase Auth (Workaround)
  const email = `${username}@internal.globalelevate.com`

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
