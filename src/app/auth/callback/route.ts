import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  const isInvite = searchParams.get('invite') === '1'
  if (isInvite || type === 'invite' || type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/set-password`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
