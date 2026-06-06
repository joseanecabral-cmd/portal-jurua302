import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface SupabaseCookie {
  name: string
  value: string
  options?: {
    path?: string
    expires?: Date
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
    domain?: string
    maxAge?: number
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await request.cookies).getAll()
        },
        async setAll(cookiesToSet: SupabaseCookie[]) {
          const requestCookies = await request.cookies
          cookiesToSet.forEach(({ name, value }) =>
            requestCookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect root
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(user ? '/dashboard' : '/login', request.url)
    )
  }

  // Logged-in users don't need the login page
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect all non-login routes
  if (pathname !== '/login' && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based protection: /admin requires admin or owner
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
