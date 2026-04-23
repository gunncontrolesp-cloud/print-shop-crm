import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'
import { deleteStaffProfileById } from '@/lib/actions/staff-profiles'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'

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
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success === 'created' && 'Staff profile created.'}
          {success === 'updated' && 'Staff profile updated.'}
          {success === 'deleted' && 'Staff profile deleted.'}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kiosk Staff</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Employees who clock in via PIN — no app login required.
          </p>
        </div>
        <Link
          href="/dashboard/settings/staff/new"
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/80 transition-colors"
        >
          Add Staff
        </Link>
      </div>

      {kioskUrl && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Kiosk URL</p>
          <p className="text-sm text-foreground break-all">
            {`${process.env.NEXT_PUBLIC_APP_URL}${kioskUrl}`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Bookmark this on the shared kiosk device.</p>
        </div>
      )}

      {!staffProfiles || staffProfiles.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No kiosk staff profiles yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {staffProfiles.map(sp => (
            <div
              key={sp.id}
              className="flex items-center justify-between px-4 py-3 bg-card border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{sp.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {sp.role} · {sp.active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <Link
                  href={`/dashboard/settings/staff/${sp.id}/edit`}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Edit
                </Link>
                <ConfirmDeleteButton action={deleteStaffProfileById.bind(null, sp.id)} label="Delete" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
