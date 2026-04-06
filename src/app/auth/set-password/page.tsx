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
  await serviceClient.from('users').upsert(
    { id: user.id, name, ...(tenantId ? { tenant_id: tenantId, role } : {}) },
    { onConflict: 'id' }
  )

  redirect('/dashboard')
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome — let's get you set up</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your name and choose a password to activate your account.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(errorMsg)}
          </div>
        )}

        <form action={setPassword} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="First and last name"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
