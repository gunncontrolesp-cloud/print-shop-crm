import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('time_entries')
    .select('*')
    .not('clocked_out_at', 'is', null)
    .order('clocked_in_at', { ascending: true })

  if (from) query = query.gte('clocked_in_at', new Date(from).toISOString())
  if (to) {
    const toDate = new Date(to)
    toDate.setHours(23, 59, 59, 999)
    query = query.lte('clocked_in_at', toDate.toISOString())
  }

  const { data: entries } = await query

  if (!entries?.length) {
    return new NextResponse('No data for selected period', { status: 200 })
  }

  // Fetch user names
  const userIds = [...new Set(entries.map((e) => e.user_id))]
  const { data: usersData } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds)
  const userMap = Object.fromEntries(
    (usersData ?? []).map((u) => [u.id, { name: u.name || '', email: u.email }])
  )

  // Build CSV
  const rows = [
    ['Employee Name', 'Email', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Notes'],
  ]

  for (const e of entries) {
    const emp = userMap[e.user_id] ?? { name: e.user_id, email: '' }
    const clockIn = new Date(e.clocked_in_at)
    const clockOut = new Date(e.clocked_out_at!)
    const hours = ((clockOut.getTime() - clockIn.getTime()) / 3600000).toFixed(2)
    const date = clockIn.toLocaleDateString('en-US')
    const inTime = clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const outTime = clockOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    rows.push([
      emp.name,
      emp.email,
      date,
      inTime,
      outTime,
      hours,
      e.status,
      e.notes ?? '',
    ])
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const filename = `timeclock-export-${from ?? 'all'}-to-${to ?? 'all'}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
