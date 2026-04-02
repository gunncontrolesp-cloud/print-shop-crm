import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyMissedClockOut } from '@/lib/n8n'

const STALE_HOURS = 10

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()

  const { data: staleEntries } = await supabase
    .from('time_entries')
    .select('id, user_id, clocked_in_at')
    .is('clocked_out_at', null)
    .lt('clocked_in_at', cutoff)

  if (!staleEntries?.length) {
    return NextResponse.json({ checked: 0, alerted: 0 })
  }

  const userIds = staleEntries.map((e) => e.user_id)
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .in('id', userIds)

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

  let alerted = 0
  for (const entry of staleEntries) {
    const user = userMap[entry.user_id]
    if (!user) continue
    const hoursElapsed = Math.floor(
      (Date.now() - new Date(entry.clocked_in_at).getTime()) / (1000 * 60 * 60)
    )
    await notifyMissedClockOut(
      entry.user_id,
      user.name || user.email,
      user.email,
      entry.clocked_in_at,
      hoursElapsed
    )
    alerted++
  }

  return NextResponse.json({ checked: staleEntries.length, alerted })
}
