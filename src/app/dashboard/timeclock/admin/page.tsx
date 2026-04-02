import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClockOut, adminApproveEntry } from '@/lib/actions/timeclock'
import { buttonVariants } from '@/components/ui/button-variants'
import type { TimeEntry } from '@/lib/types'

function formatDuration(start: string, end: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function AdminTimeClockPage() {
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

  if (profile?.role !== 'admin') redirect('/dashboard/timeclock')

  // Fetch open entries (currently clocked in)
  const { data: openEntries } = await supabase
    .from('time_entries')
    .select('*')
    .is('clocked_out_at', null)
    .order('clocked_in_at', { ascending: true })

  // Fetch recent closed entries
  const { data: closedEntries } = await supabase
    .from('time_entries')
    .select('*')
    .not('clocked_out_at', 'is', null)
    .order('clocked_in_at', { ascending: false })
    .limit(50)

  // Fetch user names for all entries
  const allEntries = [...(openEntries ?? []), ...(closedEntries ?? [])]
  const userIds = [...new Set(allEntries.map((e) => e.user_id))]

  const { data: usersData } = userIds.length
    ? await supabase.from('users').select('id, name, email').in('id', userIds)
    : { data: [] }

  const userMap = Object.fromEntries(
    (usersData ?? []).map((u) => [u.id, u.name || u.email])
  )

  const open = (openEntries ?? []) as TimeEntry[]
  const closed = (closedEntries ?? []) as TimeEntry[]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Timecard Admin</h1>
        <a
          href="/dashboard/timeclock"
          className={buttonVariants({ variant: 'outline' })}
        >
          My Time Clock
        </a>
      </div>

      {/* Currently clocked in */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Currently Clocked In
        </h2>
        {open.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No one is currently clocked in
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Employee</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Clocked In</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Duration</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {open.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {userMap[entry.user_id] ?? entry.user_id}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(entry.clocked_in_at)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDuration(entry.clocked_in_at, null)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={adminClockOut.bind(null, entry.id)}>
                        <button
                          type="submit"
                          className={buttonVariants({ variant: 'destructive', size: 'sm' })}
                        >
                          Force Clock Out
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* All timecards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          All Timecards
        </h2>
        {closed.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No completed time entries yet
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Employee</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">In</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Out</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Duration</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {closed.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {userMap[entry.user_id] ?? entry.user_id}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(entry.clocked_in_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(entry.clocked_in_at)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.clocked_out_at ? formatTime(entry.clocked_out_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.clocked_out_at
                        ? formatDuration(entry.clocked_in_at, entry.clocked_out_at)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/dashboard/timeclock/admin/${entry.id}/edit`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Edit
                        </a>
                        {entry.status === 'pending' && (
                          <form action={adminApproveEntry.bind(null, entry.id)}>
                            <button
                              type="submit"
                              className={buttonVariants({ size: 'sm' as 'default' })}
                            >
                              Approve
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
      </section>
    </div>
  )
}
