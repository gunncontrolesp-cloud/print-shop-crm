import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'
import { inviteEmployee, removeEmployee } from '@/lib/actions/employees'

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error: errorMsg, success } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // "Admins can view tenant users" RLS policy returns all users in the admin's tenant
  const { data: employees } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: true })

  const list = employees ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success === 'removed' ? 'Employee removed.' : success === 'reset' ? 'Password reset link sent.' : 'Invite sent successfully.'}
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">All staff accounts in your shop</p>
        </div>
        <form action={inviteEmployee} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="staff@example.com"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-56"
          />
          <button type="submit" className={buttonVariants({ size: 'sm' })}>
            Invite
          </button>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
          No employees found
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Employee</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Email</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Role</th>
                <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Since</th>
                <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {emp.name || emp.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                        emp.role === 'admin'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(emp.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`/dashboard/settings/employees/${emp.id}/edit`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Edit
                      </a>
                      {emp.id !== user.id && (
                        <form action={removeEmployee}>
                          <input type="hidden" name="id" value={emp.id} />
                          <button
                            type="submit"
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                            style={{ color: '#dc2626', borderColor: '#dc2626' }}
                          >
                            Remove
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
