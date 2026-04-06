import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'

async function setPassword(formData: FormData): Promise<void> {
  'use server'
  const password = formData.get('password') as string
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters')

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)

  redirect('/dashboard')
}

export default async function SetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Set your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Choose a password to secure your account.
        </p>

        <form action={setPassword} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
            Set Password &amp; Continue
          </button>
        </form>
      </div>
    </div>
  )
}
