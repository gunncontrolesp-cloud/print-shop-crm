import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'
import { deleteStaffProfile } from '@/lib/actions/staff-profiles'

export default async function StaffProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { success, error: errorMsg } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard')

  const tenantId = await getTenantId()
  const service = createServiceClient()
  const { data: staffProfiles } = await service
    .from('staff_profiles')
    .select('id, name, role, active, created_at')
    .eq('tenant_id', tenantId)
    .order('name')

  const { data: tenant } = await service.from('tenants').select('id').eq('id', tenantId).single()
  const kioskUrl = tenant ? `/timeclock/${tenant.id}` : null

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success === 'created' && 'Staff profile created.'}
          {success === 'updated' && 'Staff profile updated.'}
          {success === 'deleted' && 'Staff profile deleted.'}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kiosk Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Employees who clock in via PIN — no app login required.
          </p>
        </div>
        <Link
          href="/dashboard/settings/staff/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Add Staff
        </Link>
      </div>

      {kioskUrl && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Kiosk URL</p>
          <p className="text-sm text-gray-700 break-all">
            {`${process.env.NEXT_PUBLIC_APP_URL}${kioskUrl}`}
          </p>
          <p className="text-xs text-gray-400 mt-1">Bookmark this on the shared kiosk device.</p>
        </div>
      )}

      {!staffProfiles || staffProfiles.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-gray-400">No kiosk staff profiles yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {staffProfiles.map(sp => (
            <div
              key={sp.id}
              className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{sp.name}</p>
                <p className="text-xs text-gray-400 capitalize">
                  {sp.role} · {sp.active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/settings/staff/${sp.id}/edit`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edit
                </Link>
                <form action={deleteStaffProfile}>
                  <input type="hidden" name="id" value={sp.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:underline"
                    onClick={e => {
                      if (!confirm(`Delete ${sp.name}?`)) e.preventDefault()
                    }}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
