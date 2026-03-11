'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@mzadat/db'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/'

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Verify that user has admin/super_admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Authentication failed.' }
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, status: true },
  })

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    await supabase.auth.signOut()
    return { error: 'Access denied. Admin privileges required.' }
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut()
    return { error: 'Your account has been deactivated.' }
  }

  redirect(next)
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
