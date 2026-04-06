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
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <a href="/dashboard/settings/employees" className="text-sm text-gray-500 hover:text-gray-900">
          ← Employees
        </a>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">Edit Employee</h1>
        <p className="text-sm text-gray-500">{employee.email}</p>
      </div>

      <form action={updateEmployee} className="space-y-4">
        <input type="hidden" name="id" value={employee.id} />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            name="name"
            defaultValue={employee.name ?? ''}
            placeholder="Full name"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Role</label>
          <select name="role" defaultValue={employee.role} className={inputClass} disabled={isSelf}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && <p className="text-xs text-gray-400">You cannot change your own role.</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Save Changes
          </button>
          <a
            href="/dashboard/settings/employees"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>

      {!isSelf && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Password Reset</h2>
          <p className="text-sm text-gray-500 mb-3">
            Send this employee a link to reset their password.
          </p>
          <form action={sendPasswordReset}>
            <input type="hidden" name="email" value={employee.email} />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Send Reset Link
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
