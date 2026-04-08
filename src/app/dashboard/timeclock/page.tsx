import { createClient } from '@/lib/supabase/server'
import { clockIn, clockOut } from '@/lib/actions/timeclock'
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

export default async function TimeClockPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', user!.id)
    .is('clocked_out_at', null)
    .limit(1)
    .maybeSingle()

  // Last 7 days of closed entries
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentEntries } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', user!.id)
    .not('clocked_out_at', 'is', null)
    .gte('clocked_in_at', since)
    .order('clocked_in_at', { ascending: false })

  const isClockedIn = !!openEntry
  const entries = (recentEntries ?? []) as TimeEntry[]

  // Today's hours (closed entries only — open entry adds live time separately)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayMinutes = entries
    .filter((e) => new Date(e.clocked_in_at) >= todayStart && !!e.clocked_out_at)
    .reduce((sum, e) => {
      return sum + Math.floor(
        (new Date(e.clocked_out_at!).getTime() - new Date(e.clocked_in_at).getTime()) / 60000
      )
    }, 0)

  // Week's hours (Mon–Sun)
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1))
  const weekMinutes = entries
    .filter((e) => new Date(e.clocked_in_at) >= weekStart && !!e.clocked_out_at)
    .reduce((sum, e) => {
      return sum + Math.floor(
        (new Date(e.clocked_out_at!).getTime() - new Date(e.clocked_in_at).getTime()) / 60000
      )
    }, 0)

  const todayHours = (todayMinutes / 60).toFixed(1)
  const weekHours = (weekMinutes / 60).toFixed(1)

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Time Clock</h1>

        {/* Status card */}
        <div
          className={`rounded-2xl p-8 mb-4 text-center shadow-sm ${
            isClockedIn ? 'bg-green-50 border-2 border-green-200' : 'bg-white border-2 border-gray-200'
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest mb-3 ${
              isClockedIn ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${isClockedIn ? 'bg-green-500' : 'bg-gray-300'}`}
            />
            {isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </div>

          {isClockedIn && openEntry ? (
            <div>
              <p className="text-4xl font-bold text-green-700 mb-1">
                {formatDuration(openEntry.clocked_in_at, null)}
              </p>
              <p className="text-sm text-green-600">
                Since {formatTime(openEntry.clocked_in_at)}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-lg">Not currently clocked in</p>
          )}
        </div>

        {/* Today / Week totals */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Today</p>
            <p className="text-2xl font-bold text-gray-900">{todayHours}h</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">This Week</p>
            <p className="text-2xl font-bold text-gray-900">{weekHours}h</p>
          </div>
        </div>

        {/* Action button */}
        {isClockedIn ? (
          <form action={clockOut}>
            <button
              type="submit"
              className={`w-full py-5 text-xl font-semibold rounded-xl ${buttonVariants({ variant: 'destructive' as 'default' })}`}
            >
              Clock Out
            </button>
          </form>
        ) : (
          <form action={clockIn}>
            <button
              type="submit"
              className={`w-full py-5 text-xl font-semibold rounded-xl ${buttonVariants()}`}
            >
              Clock In
            </button>
          </form>
        )}

        {/* Recent entries */}
        {entries.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Last 7 Days
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Date</th>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">In</th>
                    <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Out</th>
                    <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-gray-600">{formatDate(entry.clocked_in_at)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatTime(entry.clocked_in_at)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {entry.clocked_out_at ? formatTime(entry.clocked_out_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {entry.clocked_out_at
                          ? formatDuration(entry.clocked_in_at, entry.clocked_out_at)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
