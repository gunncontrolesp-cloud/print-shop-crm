import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavSidebar } from '@/components/nav-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileHeader } from '@/components/mobile-header'
import { LogOut, PrinterIcon } from 'lucide-react'

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
    .select('email, role, name')
    .eq('id', user.id)
    .single()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const displayName = profile?.name ?? profile?.email ?? user.email ?? ''
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[216px] bg-sidebar flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-sidebar-primary shrink-0">
            <PrinterIcon className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-heading font-bold text-sidebar-accent-foreground leading-tight tracking-tight">
              PrintShop
            </p>
            <p className="text-[9px] text-sidebar-foreground leading-tight uppercase tracking-[0.12em]">
              CRM
            </p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 px-2 py-4 overflow-y-auto">
          <NavSidebar role={profile?.role ?? 'staff'} />
        </div>

        {/* User footer */}
        <div className="px-2 pb-3 pt-2 border-t border-sidebar-border space-y-0.5">
          <div className="flex items-center gap-2 px-2 py-2 rounded">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[9px] font-bold text-sidebar-primary-foreground">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-sidebar-accent-foreground truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[9px] text-sidebar-foreground capitalize leading-tight mt-0.5">
                {profile?.role ?? 'staff'}
              </p>
            </div>
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[11px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-150"
            >
              <LogOut className="h-3 w-3 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader
          role={profile?.role ?? 'staff'}
          displayName={displayName}
          initials={initials}
          signOut={signOut}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
