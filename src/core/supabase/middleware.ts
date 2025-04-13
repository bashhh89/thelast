import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { Database } from '@/core/supabase/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  let isAdmin = false
  if (user && !authError) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error("Middleware: Error fetching user profile:", profileError)
      // Decide how to handle profile fetch error - maybe block admin access?
    } else {
      isAdmin = profile?.is_admin || false
    }
  }

  const { pathname } = request.nextUrl

  // Define public routes
  const publicRoutes = ['/login', '/register', '/auth/callback']
  const isAdminRoute = pathname.startsWith('/admin')

  // Protect routes
  if (isAdminRoute) {
    if (!user) {
      // Not logged in, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname) // Redirect back after login
      return NextResponse.redirect(url)
    }
    if (!isAdmin) {
      // Logged in but not admin, redirect to home (or show unauthorized page)
      console.warn(`Middleware: Non-admin user (${user.id}) attempted to access admin route: ${pathname}`)
      const url = request.nextUrl.clone()
      url.pathname = '/' // Redirect to home
      return NextResponse.redirect(url)
    }
    // If user is admin, allow access (proceed to session refresh)
  } else if (!user && !publicRoutes.includes(pathname) && !pathname.startsWith('/_next') && !pathname.startsWith('/favicon.ico')) {
    // Redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  } else if (user && publicRoutes.includes(pathname)) {
    // Redirect to home
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Refresh session - essential for Server Components
  // NOTE: Must happen *after* getUser and route protection checks
  await supabase.auth.getSession()

  return supabaseResponse
} 