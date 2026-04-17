import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export default async function PortalProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/portal/login')

  const serviceClient = createServiceClient()
  const { data: customer } = await serviceClient
    .from('customers')
    .select('name, business_name')
    .eq('auth_user_id', user.id)
    .single()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/portal/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-900">Print Shop Portal</span>
          <nav className="flex gap-4">
            <Link href="/portal" className="text-sm text-gray-600 hover:text-gray-900">
              Orders
            </Link>
            <Link href="/portal/invoices" className="text-sm text-gray-600 hover:text-gray-900">
              Invoices
            </Link>
            <Link href="/portal/assets" className="text-sm text-gray-600 hover:text-gray-900">
              Assets
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {customer && (
            <span className="text-sm text-gray-600">
              {customer.name}
              {customer.business_name ? ` · ${customer.business_name}` : ''}
            </span>
          )}
          <form action={signOut}>
            <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
              Sign out →
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
