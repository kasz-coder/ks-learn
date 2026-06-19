import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { validateEnv } from '@/lib/env'

validateEnv()

export async function createSupabaseServerClient(request?: Request) {
  if (request) {
    const cookieHeader = request.headers.get('cookie') || ''
    const parsed = cookieHeader.split(';').filter(Boolean).map(c => {
      const [name, ...rest] = c.split('=')
      return { name: name.trim(), value: rest.join('=') }
    })
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return parsed },
          setAll() {},
        },
      }
    )
  }

  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored — proxy.ts handles session refresh for server components
          }
        },
      },
    }
  )
}
