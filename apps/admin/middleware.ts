import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_NAME = 'mz-admin-auth'

// Routes that don't need auth
const PUBLIC_ROUTES = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files & Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: COOKIE_NAME,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getSession() for fast local JWT decode (~0ms) instead of
  // getUser() which hits the Supabase Auth server (~1200ms).
  // The actual admin role verification happens in getCurrentAdmin().
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  // Not authenticated → redirect to login (unless already on public route)
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated on login page → redirect to dashboard
  if (user && isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
