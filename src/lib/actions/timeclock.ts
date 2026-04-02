'use server'

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
