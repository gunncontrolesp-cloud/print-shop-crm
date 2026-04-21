import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'
import type { TimeEntry } from '@/lib/types'
import DateRangeForm from './DateRangeForm'

function durationMinutes(start: string, end: string): number {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000))
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const OVERTIME_DAY_MINUTES = 8 * 60   // 8h/day
const OVERTIME_WEEK_MINUTES = 40 * 60 // 40h/week

export default async function TimeClockReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
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

  if (!['admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard/timeclock')

  const params = await searchParams
  const fromParam = params.from
  const toParam = params.to

  // Default: last 28 days
  const defaultFrom = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
  const fromDate = fromParam ? new Date(fromParam) : defaultFrom
  const toDate = toParam ? new Date(toParam) : new Date()
  toDate.setHours(23, 59, 59, 999)

  let query = supabase
    .from('time_entries')
    .select('*')
    .not('clocked_out_at', 'is', null)
    .gte('clocked_in_at', fromDate.toISOString())
    .lte('clocked_in_at', toDate.toISOString())
    .order('clocked_in_at', { ascending: false })

  const { data: rawEntries } = await query
  const entries = (rawEntries ?? []) as TimeEntry[]

  // Fetch user names
  const userIds = [...new Set(entries.map((e) => e.user_id))]
  const { data: usersData } = userIds.length
    ? await supabase.from('users').select('id, name, email').in('id', userIds)
    : { data: [] }
  const userMap = Object.fromEntries(
    (usersData ?? []).map((u) => [u.id, u.name || u.email])
  )

  // ── Per-employee summary ──────────────────────────────────────────────────
  const byEmployee: Record<string, {
    name: string
    minutes: number
    total: number
    approved: number
    days: Record<string, number> // date string → minutes
  }> = {}

  for (const entry of entries) {
    if (!entry.clocked_out_at) continue
    const mins = durationMinutes(entry.clocked_in_at, entry.clocked_out_at)
    const dayKey = new Date(entry.clocked_in_at).toLocaleDateString('en-US')

    if (!byEmployee[entry.user_id]) {
      byEmployee[entry.user_id] = {
        name: userMap[entry.user_id] ?? entry.user_id,
        minutes: 0,
        total: 0,
        approved: 0,
        days: {},
      }
    }
    byEmployee[entry.user_id].minutes += mins
    byEmployee[entry.user_id].total++
    if (entry.status === 'approved') byEmployee[entry.user_id].approved++
    byEmployee[entry.user_id].days[dayKey] = (byEmployee[entry.user_id].days[dayKey] ?? 0) + mins
  }

  const employeeRows = Object.entries(byEmployee)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.minutes - a.minutes)

  // ── Daily breakdown ───────────────────────────────────────────────────────
  type DayEntry = { employee: string; date: string; clockIn: string; clockOut: string; minutes: number; status: string; overtimeDay: boolean }
  const dailyRows: DayEntry[] = entries
    .filter((e) => !!e.clocked_out_at)
    .map((e) => {
      const mins = durationMinutes(e.clocked_in_at, e.clocked_out_at!)
      return {
        employee: userMap[e.user_id] ?? e.user_id,
        date: formatDate(e.clocked_in_at),
        clockIn: formatTime(e.clocked_in_at),
        clockOut: formatTime(e.clocked_out_at!),
        minutes: mins,
        status: e.status,
        overtimeDay: mins > OVERTIME_DAY_MINUTES,
      }
    })

  // ── Weekly overtime detection ─────────────────────────────────────────────
  // Group minutes by employee + ISO week
  const weeklyByEmployee: Record<string, Record<string, number>> = {}
  for (const entry of entries) {
    if (!entry.clocked_out_at) continue
    const mins = durationMinutes(entry.clocked_in_at, entry.clocked_out_at)
    const d = new Date(entry.clocked_in_at)
    const startOfWeek = new Date(d)
    startOfWeek.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))
    const weekKey = startOfWeek.toLocaleDateString('en-US')
    if (!weeklyByEmployee[entry.user_id]) weeklyByEmployee[entry.user_id] = {}
    weeklyByEmployee[entry.user_id][weekKey] = (weeklyByEmployee[entry.user_id][weekKey] ?? 0) + mins
  }

  const overtimeWeeks: { name: string; week: string; minutes: number }[] = []
  for (const [userId, weeks] of Object.entries(weeklyByEmployee)) {
    for (const [weekStart, mins] of Object.entries(weeks)) {
      if (mins > OVERTIME_WEEK_MINUTES) {
        overtimeWeeks.push({ name: userMap[userId] ?? userId, week: weekStart, minutes: mins })
      }
    }
  }

  const exportFrom = fromParam ?? defaultFrom.toISOString().split('T')[0]
  const exportTo = toParam ?? new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timecard Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Closed entries only</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/timeclock/export?from=${exportFrom}&to=${exportTo}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Export CSV
          </a>
          <Link href="/dashboard/timeclock/admin" className={buttonVariants({ variant: 'outline' })}>
            ← Admin
          </Link>
        </div>
      </div>

      {/* Date range filter */}
      <DateRangeForm from={fromParam} to={toParam} />

      {/* Overtime alerts */}
      {overtimeWeeks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-3">
            Overtime Alerts — Week &gt; 40h
          </h2>
          <div className="bg-orange-50 rounded-xl border border-orange-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-600 font-medium">Employee</th>
                  <th className="px-4 py-2.5 text-left text-gray-600 font-medium">Week of</th>
                  <th className="px-4 py-2.5 text-right text-gray-600 font-medium">Total Hours</th>
                  <th className="px-4 py-2.5 text-right text-gray-600 font-medium">Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {overtimeWeeks.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.week}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-700">
                      {formatHours(row.minutes)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      +{formatHours(row.minutes - OVERTIME_WEEK_MINUTES)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Employee summary */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Hours by Employee
        </h2>
        {employeeRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No completed entries for this period
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Employee</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Entries</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Approved</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeeRows.map((row) => (
                  <tr key={row.userId}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.total}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.approved}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatHours(row.minutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Daily breakdown */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Daily Breakdown
        </h2>
        {dailyRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No entries for this period
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Employee</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium hidden sm:table-cell">In</th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium hidden sm:table-cell">Out</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Hours</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dailyRows.map((row, i) => (
                  <tr key={i} className={row.overtimeDay ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.employee}</td>
                    <td className="px-4 py-3 text-gray-600">{row.date}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{row.clockIn}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{row.clockOut}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${row.overtimeDay ? 'text-orange-600' : 'text-gray-900'}`}>
                      {formatHours(row.minutes)}
                      {row.overtimeDay && <span className="ml-1 text-xs font-normal">OT</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === 'approved' ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          Approved
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
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
