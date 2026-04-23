import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateEmployee, sendPasswordReset } from '@/lib/actions/employees'

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: employee } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('id', id)
    .single()

  if (!employee) redirect('/dashboard/settings/employees')

  const isSelf = employee.id === user.id

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="p-4 sm:p-8 max-w-lg">
      <div className="mb-6">
        <a href="/dashboard/settings/employees" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Employees
        </a>
        <h1 className="text-2xl font-semibold text-foreground mt-2">Edit Employee</h1>
        <p className="text-sm text-muted-foreground">{employee.email}</p>
      </div>

      <form action={updateEmployee} className="space-y-4">
        <input type="hidden" name="id" value={employee.id} />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Name</label>
          <input
            name="name"
            defaultValue={employee.name ?? ''}
            placeholder="Full name"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Role</label>
          <select name="role" defaultValue={employee.role} className={inputClass} disabled={isSelf}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && <p className="text-xs text-muted-foreground">You cannot change your own role.</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-background bg-foreground rounded-lg hover:bg-foreground/80 transition-colors"
          >
            Save Changes
          </button>
          <a
            href="/dashboard/settings/employees"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/60 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>

      {!isSelf && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <h2 className="text-sm font-semibold text-foreground mb-1">Password Reset</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Send this employee a link to reset their password.
          </p>
          <form action={sendPasswordReset}>
            <input type="hidden" name="email" value={employee.email} />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/60 transition-colors"
            >
              Send Reset Link
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
