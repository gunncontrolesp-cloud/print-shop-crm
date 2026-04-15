import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { inviteEmployee, removeEmployee } from '@/lib/actions/employees'
import { UserCog } from 'lucide-react'

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error: errorMsg, success } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: employees } = await supabase
    .from('users')
    .select('id, email, name, role, created_at')
    .order('created_at', { ascending: true })

  const list = employees ?? []

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success === 'removed' ? 'Employee removed.' : success === 'reset' ? 'Password reset link sent.' : 'Invite sent successfully.'}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">{list.length} staff account{list.length !== 1 ? 's' : ''}</p>
        </div>
        <form action={inviteEmployee} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="staff@example.com"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 bg-white"
          />
          <button
            type="submit"
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Invite
          </button>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
              <UserCog className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No employees yet</p>
            <p className="text-sm text-slate-400">Invite your first team member above.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Since</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                        {(emp.name || emp.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{emp.name || emp.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{emp.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.role === 'admin'
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                    }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {new Date(emp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/dashboard/settings/employees/${emp.id}/edit`}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </a>
                      {emp.id !== user.id && (
                        <form action={removeEmployee}>
                          <input type="hidden" name="id" value={emp.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
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
