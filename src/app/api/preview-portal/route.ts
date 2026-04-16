import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const customerId = searchParams.get('customer_id')

  if (!customerId) {
    return NextResponse.json({ error: 'Missing customer_id' }, { status: 400 })
  }

  // Verify requester is an authenticated admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceClient = createServiceClient()

  // Get the customer
  const { data: customer } = await serviceClient
    .from('customers')
    .select('id, email')
    .eq('id', customerId)
    .single()

  if (!customer?.email) {
    return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 })
  }

  // Generate a magic link server-side (no email sent)
  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email: customer.email,
    options: {
      redirectTo: `${origin}/portal/auth/callback`,
    },
  })

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate link' }, { status: 500 })
  }

  // Always set auth_user_id to the generated session user (overwrites any prior value)
  await serviceClient
    .from('customers')
    .update({ auth_user_id: data.user.id })
    .eq('id', customerId)

  return NextResponse.redirect(data.properties.action_link)
}
