import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'

async function setPassword(formData: FormData): Promise<void> {
  'use server'
  const name = ((formData.get('name') as string) ?? '').trim()
  const password = formData.get('password') as string

  if (!name) redirect('/auth/set-password?error=Name+is+required')
  if (!password || password.length < 8)
    redirect('/auth/set-password?error=Password+must+be+at+least+8+characters')

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  const { error: pwError } = await supabase.auth.updateUser({ password })
  if (pwError) redirect(`/auth/set-password?error=${encodeURIComponent(pwError.message)}`)

  // Upsert user record — repairs trigger failures and applies invite metadata (tenant_id, role)
  const tenantId = user.user_metadata?.tenant_id as string | undefined
  const role = (user.user_metadata?.role as string) ?? 'staff'
  const serviceClient = createServiceClient()
  const { error: upsertError } = await serviceClient.from('users').upsert(
    { id: user.id, email: user.email, name, ...(tenantId ? { tenant_id: tenantId, role } : {}) },
    { onConflict: 'id' }
  )
  if (upsertError) redirect(`/auth/set-password?error=${encodeURIComponent(upsertError.message)}`)

  const landingPage = ['admin', 'manager'].includes(role) ? '/dashboard' : '/dashboard/timeclock'
  redirect(landingPage)
}

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorMsg } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card rounded-xl border border-border p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-foreground mb-1">Welcome — let&apos;s get you set up</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your name and choose a password to activate your account.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        <form action={setPassword} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Your Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
              placeholder="First and last name"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
              placeholder="Min. 8 characters"
            />
          </div>

          <button type="submit" className={`w-full ${buttonVariants()}`}>
            Activate Account
          </button>
        </form>
      </div>
    </div>
  )
}
