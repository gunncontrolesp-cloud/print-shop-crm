import { createClient } from '@/lib/supabase/server'
import { clockIn, clockOut } from '@/lib/actions/timeclock'
import type { TimeEntry } from '@/lib/types'
import { fmtTime, fmtDate, startOfTodayInTz, startOfWeekInTz } from '@/lib/tz'

function formatDuration(start: string, end: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

export default async function TimeClockPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: tenantRow } = await supabase.from('tenants').select('timezone').single()
  const tz = tenantRow?.timezone ?? 'America/Chicago'

  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', user!.id)
    .is('clocked_out_at', null)
    .limit(1)
    .maybeSingle()

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

  const todayStart = startOfTodayInTz(tz)
  const todayMinutes = entries
    .filter((e) => new Date(e.clocked_in_at) >= todayStart && !!e.clocked_out_at)
    .reduce((sum, e) => sum + Math.floor(
      (new Date(e.clocked_out_at!).getTime() - new Date(e.clocked_in_at).getTime()) / 60000
    ), 0)

  const weekStart = startOfWeekInTz(tz)
  const weekMinutes = entries
    .filter((e) => new Date(e.clocked_in_at) >= weekStart && !!e.clocked_out_at)
    .reduce((sum, e) => sum + Math.floor(
      (new Date(e.clocked_out_at!).getTime() - new Date(e.clocked_in_at).getTime()) / 60000
    ), 0)

  const todayHours = (todayMinutes / 60).toFixed(1)
  const weekHours = (weekMinutes / 60).toFixed(1)

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-8 text-center">Time Clock</h1>

        {/* Status card */}
        <div className={`rounded-2xl p-8 mb-4 text-center shadow-sm border-2 ${
          isClockedIn
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-card border-border'
        }`}>
          <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-4 ${
            isClockedIn ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </div>

          {isClockedIn && openEntry ? (
            <div>
              <p className="text-5xl font-bold text-emerald-700 mb-2 tabular-nums">
                {formatDuration(openEntry.clocked_in_at, null)}
              </p>
              <p className="text-sm text-emerald-600">
                Since {fmtTime(openEntry.clocked_in_at, tz)}
              </p>
            </div>
          ) : (
            <p className="text-slate-400 text-lg">Not currently clocked in</p>
          )}
        </div>

        {/* Today / Week totals */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Today</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{todayHours}h</p>
          </div>
          <div className="bg-card rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">This Week</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{weekHours}h</p>
          </div>
        </div>

        {/* Action button */}
        {isClockedIn ? (
          <form action={clockOut}>
            <button
              type="submit"
              className="w-full py-4 text-lg font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
            >
              Clock Out
            </button>
          </form>
        ) : (
          <form action={clockIn}>
            <button
              type="submit"
              className="w-full py-4 text-lg font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Clock In
            </button>
          </form>
        )}

        {/* Recent entries */}
        {entries.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Last 7 Days</p>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Out</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/30">
                      <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(entry.clocked_in_at, tz)}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs hidden sm:table-cell">{fmtTime(entry.clocked_in_at, tz)}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs hidden sm:table-cell">
                        {entry.clocked_out_at ? fmtTime(entry.clocked_out_at, tz) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 text-xs tabular-nums">
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
