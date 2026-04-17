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
  const isRecovery = searchParams.get('recovery') === '1' || type === 'recovery'
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/auth/reset-password`)
  }
  if (isInvite || type === 'invite') {
    return NextResponse.redirect(`${origin}/auth/set-password`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
