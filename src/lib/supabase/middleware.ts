import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  console.log('[middleware] env check:', {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Staff logged in: check tenant + tier gates
  if (user && pathname.startsWith('/dashboard')) {
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
    const { data: userRecord } = await serviceClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.tenant_id) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // Tier gate — only fetch tenant for gated routes to avoid extra DB call on every request
    const PRO_ROUTES = ['/dashboard/production', '/dashboard/invoices']
    const PREMIUM_ROUTES = ['/dashboard/analytics', '/dashboard/inventory']
    const needsPro = PRO_ROUTES.some((r) => pathname.startsWith(r))
    const needsPremium = PREMIUM_ROUTES.some((r) => pathname.startsWith(r))

    if (needsPro || needsPremium) {
      const { data: tenant } = await serviceClient
        .from('tenants')
        .select('plan_tier')
        .eq('id', userRecord.tenant_id)
        .single()

      const tier = tenant?.plan_tier ?? 'starter'
      const hasAccess =
        (needsPremium && tier === 'premium') ||
        (needsPro && !needsPremium && (tier === 'pro' || tier === 'premium'))

      if (!hasAccess) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/upgrade'
        return NextResponse.redirect(url)
      }
    }
  }

  // Onboarding: no user → /login
  if (!user && pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Onboarding: user with tenant already set → /dashboard (only from root; /subscribe must pass through)
  if (user && pathname === '/onboarding') {
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
    const { data: userRecord } = await serviceClient
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    if (userRecord?.tenant_id) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Portal: unauthenticated → /portal/login
  if (
    !user &&
    pathname.startsWith('/portal') &&
    !pathname.startsWith('/portal/login') &&
    !pathname.startsWith('/portal/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/portal/login'
    return NextResponse.redirect(url)
  }

  // Portal login: authenticated → /portal
  if (user && pathname === '/portal/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/portal'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
