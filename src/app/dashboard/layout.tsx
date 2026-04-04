import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/nav-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', user.id)
    .single()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900 leading-tight">
            Print Shop CRM
          </h1>
        </div>

        <div className="flex-1 px-3 py-4">
          <NavSidebar role={profile?.role ?? 'staff'} />
        </div>

        <div className="px-4 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 truncate mb-1">
            {profile?.email ?? user.email}
          </p>
          <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 capitalize mb-3">
            {profile?.role ?? 'staff'}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              Sign out →
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
