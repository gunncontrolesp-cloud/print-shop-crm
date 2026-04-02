import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button-variants'
import type { TimeEntry } from '@/lib/types'

function durationMinutes(start: string, end: string): number {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000))
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export default async function TimeClockReportsPage() {
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

  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()

  const { data: rawEntries } = await supabase
    .from('time_entries')
    .select('*')
    .not('clocked_out_at', 'is', null)
    .gte('clocked_in_at', since)
    .order('clocked_in_at', { ascending: false })

  const entries = (rawEntries ?? []) as TimeEntry[]

  // Fetch user names
  const userIds = [...new Set(entries.map((e) => e.user_id))]
  const { data: usersData } = userIds.length
    ? await supabase.from('users').select('id, name, email').in('id', userIds)
    : { data: [] }
  const userMap = Object.fromEntries(
    (usersData ?? []).map((u) => [u.id, u.name || u.email])
  )

  // Hours by employee
  const byEmployee: Record<string, { name: string; minutes: number; total: number; approved: number }> = {}
  for (const entry of entries) {
    if (!entry.clocked_out_at) continue
    const mins = durationMinutes(entry.clocked_in_at, entry.clocked_out_at)
    if (!byEmployee[entry.user_id]) {
      byEmployee[entry.user_id] = { name: userMap[entry.user_id] ?? entry.user_id, minutes: 0, total: 0, approved: 0 }
    }
    byEmployee[entry.user_id].minutes += mins
    byEmployee[entry.user_id].total++
    if (entry.status === 'approved') byEmployee[entry.user_id].approved++
  }
  const employeeRows = Object.values(byEmployee).sort((a, b) => b.minutes - a.minutes)

  // Hours by job
  const byJob: Record<string, { label: string; minutes: number; count: number }> = {}
  for (const entry of entries) {
    if (!entry.clocked_out_at) continue
    const key = entry.job_id ?? '__unassigned__'
    const label = entry.job_id ? entry.job_id.slice(0, 8) + '…' : 'Unassigned'
    const mins = durationMinutes(entry.clocked_in_at, entry.clocked_out_at)
    if (!byJob[key]) byJob[key] = { label, minutes: 0, count: 0 }
    byJob[key].minutes += mins
    byJob[key].count++
  }
  const jobRows = Object.values(byJob).sort((a, b) => b.minutes - a.minutes)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timecard Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Last 28 days — closed entries only</p>
        </div>
        <a
          href="/dashboard/timeclock/admin"
          className={buttonVariants({ variant: 'outline' })}
        >
          ← Admin
        </a>
      </div>

      {/* Hours by Employee */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Hours by Employee
        </h2>
        {employeeRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No completed entries in the last 28 days
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
                  <tr key={row.name}>
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
        <p className="text-xs text-gray-400 mt-2">
          Labor cost calculation requires hourly rates (not yet configured).
        </p>
      </section>

      {/* Hours by Job */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Hours by Job
        </h2>
        {jobRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No job-linked entries in the last 28 days
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium">Job</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Entries</th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.count}</td>
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
    </div>
  )
}
