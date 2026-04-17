import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'
import { updateStaffProfile } from '@/lib/actions/staff-profiles'

export default async function EditStaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorMsg } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard')

  const tenantId = await getTenantId()
  const service = createServiceClient()
  const { data: sp } = await service
    .from('staff_profiles')
    .select('id, name, role, active')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!sp) notFound()

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-8 max-w-md">
      <div className="mb-6">
        <Link href="/dashboard/settings/staff" className="text-sm text-gray-500 hover:text-gray-900">
          ← Kiosk Staff
        </Link>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit: {sp.name}</h1>

      <form action={updateStaffProfile} className="space-y-4">
        <input type="hidden" name="id" value={sp.id} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input name="name" required defaultValue={sp.name} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Role</label>
          <select name="role" className={inputClass} defaultValue={sp.role}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">New PIN (leave blank to keep current)</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            minLength={4}
            maxLength={4}
            placeholder="••••"
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            id="active"
            value="true"
            defaultChecked={sp.active}
            className="accent-gray-900"
          />
          <label htmlFor="active" className="text-sm text-gray-700">Active (can clock in)</label>
        </div>
        <div className="pt-2">
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
