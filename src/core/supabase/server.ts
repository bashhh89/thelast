import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { cookies } from 'next/headers'
import { Database } from '@/core/supabase/database.types'

// Note: This server client is primarily for Server Components and Route Handlers
// where the `cookies()` function is available.
// For Server Actions and Middleware, a different approach might be needed
// if you need to pass cookies differently.

// Helper for Server Components and Route Handlers (read-only cookies)
export function createServerComponentClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // No set/remove needed for read-only contexts
      },
    }
  )
}

// Helper for Server Actions (read/write cookies)
export function createServerActionClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // We need a mutable cookie store here, which cookies() provides in Server Actions
            // but the type ReadonlyRequestCookies doesn't reflect that directly.
            // Assuming the passed cookieStore in Server Actions context IS mutable.
            (cookieStore as any).set({ name, value, ...options })
          } catch (error) {
            console.error("Failed to set cookie in Server Action Client", error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            (cookieStore as any).set({ name, value: '', ...options })
          } catch (error) {
            console.error("Failed to remove cookie in Server Action Client", error)
          }
        },
      },
    }
  )
} 