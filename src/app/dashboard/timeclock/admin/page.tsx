import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClockOut, adminApproveEntry } from '@/lib/actions/timeclock'
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard/timeclock')

  const { data: openEntries } = await supabase
    .from('time_entries')
    .select('*')
    .is('clocked_out_at', null)
    .order('clocked_in_at', { ascending: true })

  const { data: closedEntries } = await supabase
    .from('time_entries')
    .select('*')
    .not('clocked_out_at', 'is', null)
    .order('clocked_in_at', { ascending: false })
    .limit(50)

  const allEntries = [...(openEntries ?? []), ...(closedEntries ?? [])]
  const userIds = [...new Set(allEntries.map((e) => e.user_id))]
  const { data: usersData } = userIds.length
    ? await supabase.from('users').select('id, name, email').in('id', userIds)
    : { data: [] }

  const userMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, u.name || u.email]))

  const open = (openEntries ?? []) as TimeEntry[]
  const closed = (closedEntries ?? []) as TimeEntry[]

  const todayStr = new Date().toDateString()
  const missingPunches = open.filter((e) => new Date(e.clocked_in_at).toDateString() !== todayStr)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEntries = closed.filter((e) => new Date(e.clocked_in_at) >= todayStart)
  const totalMinutesToday = todayEntries.reduce((sum, e) => {
    if (!e.clocked_out_at) return sum
    return sum + Math.floor((new Date(e.clocked_out_at).getTime() - new Date(e.clocked_in_at).getTime()) / 60000)
  }, 0)
  const totalHoursToday = (totalMinutesToday / 60).toFixed(1)
  const pendingCount = closed.filter((e) => e.status === 'pending').length

  const thClass = 'px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide'

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timecard Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage employee time entries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/dashboard/timeclock/reports"
            className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Reports
          </a>
          <a
            href="/dashboard/timeclock"
            className="flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            My Clock
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Clocked In Now</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{open.length - missingPunches.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Hours Today</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">{totalHoursToday}</p>
        </div>
        <div className={`rounded-xl border shadow-sm px-4 py-4 ${missingPunches.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Missing Punches</p>
          <p className={`text-3xl font-bold tabular-nums ${missingPunches.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {missingPunches.length}
          </p>
        </div>
        <div className={`rounded-xl border shadow-sm px-4 py-4 ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pending Approvals</p>
          <p className={`text-3xl font-bold tabular-nums ${pendingCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {pendingCount}
          </p>
        </div>
      </div>

      {/* Missing punches alert */}
      {missingPunches.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-3">Missing Clock-Outs</p>
          <div className="bg-white rounded-xl border border-rose-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/50">
                  <th className={thClass}>Employee</th>
                  <th className={thClass}>Clocked In</th>
                  <th className={thClass}>Elapsed</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {missingPunches.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{userMap[entry.user_id] ?? entry.user_id}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{formatDate(entry.clocked_in_at)} {formatTime(entry.clocked_in_at)}</td>
                    <td className="px-5 py-3.5 text-rose-600 font-medium text-xs tabular-nums">{formatDuration(entry.clocked_in_at, null)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/dashboard/timeclock/admin/${entry.id}/edit`}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </a>
                        <form action={adminClockOut.bind(null, entry.id)}>
                          <button type="submit" className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors">
                            Force Clock Out
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Currently clocked in */}
      <section className="mb-8">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Currently Clocked In</p>
        {open.filter((e) => new Date(e.clocked_in_at).toDateString() === todayStr).length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm shadow-sm">
            No one is currently clocked in
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={thClass}>Employee</th>
                  <th className={`${thClass} hidden sm:table-cell`}>Clocked In</th>
                  <th className={thClass}>Duration</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {open.filter((e) => new Date(e.clocked_in_at).toDateString() === todayStr).map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{userMap[entry.user_id] ?? entry.user_id}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs hidden sm:table-cell">{formatTime(entry.clocked_in_at)}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs tabular-nums">{formatDuration(entry.clocked_in_at, null)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <form action={adminClockOut.bind(null, entry.id)}>
                        <button type="submit" className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors">
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
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">All Timecards</p>
        {closed.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm shadow-sm">
            No completed time entries yet
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={thClass}>Employee</th>
                  <th className={thClass}>Date</th>
                  <th className={`${thClass} hidden sm:table-cell`}>In</th>
                  <th className={`${thClass} hidden sm:table-cell`}>Out</th>
                  <th className={thClass}>Duration</th>
                  <th className={thClass}>Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{userMap[entry.user_id] ?? entry.user_id}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{formatDate(entry.clocked_in_at)}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs hidden sm:table-cell">{formatTime(entry.clocked_in_at)}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs hidden sm:table-cell">
                      {entry.clocked_out_at ? formatTime(entry.clocked_out_at) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs tabular-nums">
                      {entry.clocked_out_at ? formatDuration(entry.clocked_in_at, entry.clocked_out_at) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {entry.status === 'approved' ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/dashboard/timeclock/admin/${entry.id}/edit`}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </a>
                        {entry.status === 'pending' && (
                          <form action={adminApproveEntry.bind(null, entry.id)}>
                            <button type="submit" className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
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
