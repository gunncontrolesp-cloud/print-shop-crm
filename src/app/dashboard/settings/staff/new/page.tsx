import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createStaffProfile } from '@/lib/actions/staff-profiles'

export default async function NewStaffProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: errorMsg } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard')

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-4 sm:p-8 max-w-md">
      <div className="mb-6">
        <Link href="/dashboard/settings/staff" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Kiosk Staff
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      <h1 className="text-2xl font-semibold text-foreground mb-6">Add Staff Profile</h1>

      <form action={createStaffProfile} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Full Name</label>
          <input name="name" required placeholder="e.g. Maria Lopez" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Role</label>
          <select name="role" className={inputClass} defaultValue="staff">
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">PIN (4 digits)</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            minLength={4}
            maxLength={4}
            required
            placeholder="••••"
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">Must be unique among active staff in your shop.</p>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create Profile
          </button>
        </div>
      </form>
    </div>
  )
}
