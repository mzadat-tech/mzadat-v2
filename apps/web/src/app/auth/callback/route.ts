import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // Sync OAuth user with our API to ensure they have a public.profile
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`
      try {
        const res = await fetch(`${apiUrl}/auth/oauth/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        const data = await res.json()
        
        if (res.status === 404 && data.requireCompletion) {
          return NextResponse.redirect(`${origin}/auth/complete-profile`)
        }
      } catch (err) {
        console.error('Failed to sync OAuth profile:', err)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/auth/login?error=auth`)
}
