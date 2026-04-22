import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { inviteEmployee, removeEmployeeById } from '@/lib/actions/employees'
import { UserCog } from 'lucide-react'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'

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
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
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
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-56 bg-card"
          />
          <button
            type="submit"
            className="flex items-center px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Invite
          </button>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
              <UserCog className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No employees yet</p>
            <p className="text-sm text-slate-400">Invite your first team member above.</p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Since</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((emp) => (
                <tr key={emp.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {(emp.name || emp.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{emp.name || emp.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{emp.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      emp.role === 'admin'
                        ? 'bg-primary/5 text-primary ring-1 ring-primary/20'
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
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/60 transition-colors"
                      >
                        Edit
                      </a>
                      {emp.id !== user.id && (
                        <ConfirmDeleteButton
                          action={removeEmployeeById.bind(null, emp.id)}
                          label="Remove"
                        />
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
