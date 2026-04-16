import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data.user) {
      const serviceClient = createServiceClient()
      await serviceClient
        .from('customers')
        .update({ auth_user_id: data.user.id })
        .eq('email', data.user.email)
        .is('auth_user_id', null)
    }
  }

  return NextResponse.redirect(`${origin}/portal`)
}
