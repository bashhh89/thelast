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
  const isApiRoute = pathname.startsWith('/api/') // Add check for API routes

  // Protect routes
  if (isAdminRoute && !isApiRoute) { // <-- Apply redirects ONLY to non-API admin routes
    if (!user) {
      // Not logged in, redirect to login page
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname) // Redirect back after login
      console.log(`Middleware: No user found for admin page ${pathname}. Redirecting to login.`);
      return NextResponse.redirect(url)
    }
    if (!isAdmin) {
      // Logged in but not admin, redirect to home page
      console.warn(`Middleware: Non-admin user (${user.id}) attempted to access admin page: ${pathname}. Redirecting to home.`);
      const url = request.nextUrl.clone()
      url.pathname = '/' // Redirect to home
      return NextResponse.redirect(url)
    }
    // If user is admin and it's a page, allow access (proceed to session refresh)
  } else if (isApiRoute && isAdminRoute) {
    // For ADMIN API routes, check auth but return JSON error instead of redirect
    if (!user) {
       console.log(`Middleware: No user found for admin API route ${pathname}. Returning 401.`);
       return new NextResponse(JSON.stringify({ error: 'Unauthorized', message: 'Authentication required.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (!isAdmin) {
       console.warn(`Middleware: Non-admin user (${user.id}) attempted to access admin API route: ${pathname}. Returning 403.`);
       return new NextResponse(JSON.stringify({ error: 'Forbidden', message: 'Admin privileges required.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    // If user is admin, allow API request to proceed to session refresh and handler

  } else if (!isApiRoute && !user && !publicRoutes.includes(pathname) && !pathname.startsWith('/_next') && !pathname.startsWith('/favicon.ico')) {
    // Redirect non-API, non-public routes to login if not logged in
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    console.log(`Middleware: No user found for protected page ${pathname}. Redirecting to login.`);
    return NextResponse.redirect(url)
  } else if (!isApiRoute && user && publicRoutes.includes(pathname)) {
    // Redirect logged-in users away from public pages (like login)
    const url = request.nextUrl.clone()
    url.pathname = '/'
    console.log(`Middleware: Logged-in user accessing public page ${pathname}. Redirecting to home.`);
    return NextResponse.redirect(url)
  }

  // Allow other requests (e.g., public API routes, static files handled by matcher) to proceed
  // Also allows authenticated, authorized requests for pages and API routes to proceed here

  // Refresh session - essential for Server Components
  // NOTE: Must happen *after* getUser and route protection checks
  await supabase.auth.getSession()

  return supabaseResponse
} 