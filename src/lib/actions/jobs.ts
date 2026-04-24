'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { JOB_STAGE_SEQUENCE, ORDER_STATUS_SEQUENCE, type JobStage, type OrderStatus } from '@/lib/types'
import { notifyJobReady } from '@/lib/n8n'

export async function updateJobStage(
  jobId: string,
  stage: JobStage
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: job } = await supabase
    .from('jobs')
    .select('stage, order_id')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }

  const currentIdx = JOB_STAGE_SEQUENCE.indexOf(job.stage as JobStage)
  const targetIdx = JOB_STAGE_SEQUENCE.indexOf(stage)

  if (targetIdx !== currentIdx + 1) {
    return { error: `Invalid stage transition: ${job.stage} → ${stage}` }
  }

  // Payment gate: invoice must be paid before moving to printing
  if (stage === 'printing') {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status')
      .eq('order_id', job.order_id)
      .eq('status', 'paid')
      .maybeSingle()

    if (!invoice) {
      return { error: 'Invoice must be paid before moving to Printing' }
    }
  }

  const { error } = await supabase
    .from('jobs')
    .update({ stage })
    .eq('id', jobId)

  if (error) return { error: error.message }

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

  // Sync order status when job advances to printing, finishing, or ready_for_pickup
  const orderStatusMap: Partial<Record<JobStage, OrderStatus>> = {
    printing: 'printing',
    finishing: 'finishing',
    ready_for_pickup: 'completed',
  }
  const targetOrderStatus = orderStatusMap[stage]
  if (targetOrderStatus && job.order_id) {
    const { data: order } = await supabase
      .from('orders')
      .select('status')
      .eq('id', job.order_id)
      .single()

    if (order) {
      const currentIdx = ORDER_STATUS_SEQUENCE.indexOf(order.status as OrderStatus)
      const targetIdx = ORDER_STATUS_SEQUENCE.indexOf(targetOrderStatus)
      if (targetIdx > currentIdx) {
        const serviceClient = createServiceClient()
        await serviceClient
          .from('orders')
          .update({ status: targetOrderStatus })
          .eq('id', job.order_id)
        revalidatePath(`/dashboard/orders/${job.order_id}`)
      }
    }
  }

  revalidatePath('/dashboard/production')
  revalidatePath('/dashboard/orders')
  return {}
}

export async function deleteJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return { error: 'Not authorized' }
  }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.from('jobs').delete().eq('id', jobId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/production')
  revalidatePath('/dashboard/orders')
  return {}
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
