import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component — cookies can't be set; middleware handles refresh
          }
        },
      },
    }
  )
}
