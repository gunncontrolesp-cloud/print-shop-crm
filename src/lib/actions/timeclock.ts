'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

export async function clockIn(_formData?: FormData, jobId?: string, taskStage?: string): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = await getTenantId()

  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', user.id)
    .is('clocked_out_at', null)
    .single()

  if (openEntry) throw new Error('Already clocked in')

  const { error } = await supabase.from('time_entries').insert({
    tenant_id: tenantId,
    user_id: user.id,
    clocked_in_at: new Date().toISOString(),
    job_id: jobId ?? null,
    task_stage: taskStage ?? null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/timeclock')
}

export async function clockOut(): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: openEntry } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', user.id)
    .is('clocked_out_at', null)
    .order('clocked_in_at', { ascending: false })
    .limit(1)
    .single()

  if (!openEntry) throw new Error('Not clocked in')

  const { error } = await supabase
    .from('time_entries')
    .update({ clocked_out_at: new Date().toISOString() })
    .eq('id', openEntry.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/timeclock')
}

// ── Admin actions ────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) throw new Error('Manager access required')

  return { supabase, user }
}

export async function adminClockOut(entryId: string, _formData?: FormData): Promise<void> {
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('time_entries')
    .update({ clocked_out_at: new Date().toISOString() })
    .eq('id', entryId)
    .is('clocked_out_at', null)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/timeclock/admin')
}

export async function adminApproveEntry(entryId: string, _formData?: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()

  const { data: entry } = await supabase
    .from('time_entries')
    .select('clocked_out_at')
    .eq('id', entryId)
    .single()

  if (!entry?.clocked_out_at) throw new Error('Cannot approve open entry')

  const { error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', entryId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/timeclock/admin')
}

export async function adminEditEntryForm(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()

  const entryId = formData.get('entryId') as string
  const clockedInAtRaw = formData.get('clockedInAt') as string
  const clockedOutAtRaw = formData.get('clockedOutAt') as string | null
  const notes = (formData.get('notes') as string) || null

  const clockedInAt = new Date(clockedInAtRaw).toISOString()
  const clockedOutAt = clockedOutAtRaw ? new Date(clockedOutAtRaw).toISOString() : null

  if (clockedOutAt && clockedOutAt <= clockedInAt) {
    throw new Error('Clock-out time must be after clock-in time')
  }

  const { error } = await supabase
    .from('time_entries')
    .update({ clocked_in_at: clockedInAt, clocked_out_at: clockedOutAt, notes })
    .eq('id', entryId)

  if (error) throw new Error(error.message)

  redirect('/dashboard/timeclock/admin')
}
