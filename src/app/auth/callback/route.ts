import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  const isInvite = searchParams.get('invite') === '1' || type === 'invite'
  const isRecovery = searchParams.get('recovery') === '1' || type === 'recovery'

  const redirectUrl = isRecovery
    ? `${origin}/auth/reset-password`
    : isInvite
    ? `${origin}/auth/set-password`
    : `${origin}/dashboard`

  const response = NextResponse.redirect(redirectUrl)

  if (code) {
    // Use createServerClient directly so we can write session cookies onto
    // the redirect response — the shared cookies() store does NOT propagate
    // cookie mutations to a separately-created NextResponse.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return response
}
