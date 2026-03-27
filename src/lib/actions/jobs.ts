'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { JOB_STAGE_SEQUENCE, type JobStage } from '@/lib/types'
import { notifyJobReady } from '@/lib/n8n'

export async function updateJobStage(jobId: string, stage: JobStage) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: job } = await supabase
    .from('jobs')
    .select('stage')
    .eq('id', jobId)
    .single()

  if (!job) throw new Error('Job not found')

  const currentIdx = JOB_STAGE_SEQUENCE.indexOf(job.stage as JobStage)
  const targetIdx = JOB_STAGE_SEQUENCE.indexOf(stage)

  if (targetIdx !== currentIdx + 1) {
    throw new Error(`Invalid stage transition: ${job.stage} → ${stage}`)
  }

  const { error } = await supabase
    .from('jobs')
    .update({ stage })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  if (stage === 'ready_for_pickup') {
    const { data: jobWithOrder } = await supabase
      .from('jobs')
      .select('order_id, orders(customer_id, customers(name, email, phone))')
      .eq('id', jobId)
      .single()
    const order = Array.isArray(jobWithOrder?.orders) ? jobWithOrder.orders[0] : jobWithOrder?.orders
    const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers
    if (customer?.email && jobWithOrder?.order_id) {
      await notifyJobReady(
        jobId,
        jobWithOrder.order_id,
        customer.email,
        customer.name ?? '',
        customer.phone ?? null
      )
    }
  }

  revalidatePath('/dashboard/production')
  revalidatePath('/dashboard/orders')
}

export async function completeJob(jobId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('jobs')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/production')
}
