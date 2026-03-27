'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notifyProofDecision } from '@/lib/n8n'

export async function approveProof(jobId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // RLS ensures customer only sees their own jobs
  const { data: job } = await supabase
    .from('jobs')
    .select('id, order_id, stage, proof_decision')
    .eq('id', jobId)
    .single()

  if (!job) throw new Error('Job not found')
  if (job.stage !== 'proofing') throw new Error('Job is not in proofing stage')
  if (job.proof_decision) throw new Error('Proof decision already submitted')

  const { error } = await supabase
    .from('jobs')
    .update({ proof_decision: 'approved', stage: 'printing' })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  // Fetch customer info for notification
  const serviceClient = createServiceClient()
  const { data: jobWithCustomer } = await serviceClient
    .from('jobs')
    .select('orders(customers(name, email))')
    .eq('id', jobId)
    .single()

  const order = Array.isArray(jobWithCustomer?.orders)
    ? jobWithCustomer.orders[0]
    : jobWithCustomer?.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers

  await notifyProofDecision(
    jobId,
    job.order_id,
    'approved',
    '',
    customer?.email ?? '',
    customer?.name ?? ''
  )

  revalidatePath('/portal/orders/' + job.order_id)
  revalidatePath('/dashboard/production')
  revalidatePath('/dashboard/orders/' + job.order_id)
}

export async function requestProofChanges(jobId: string, formData: FormData) {
  const comments = (formData.get('comments') as string)?.trim()
  if (!comments) throw new Error('Comments are required')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // RLS ensures customer only sees their own jobs
  const { data: job } = await supabase
    .from('jobs')
    .select('id, order_id, stage, proof_decision')
    .eq('id', jobId)
    .single()

  if (!job) throw new Error('Job not found')
  if (job.stage !== 'proofing') throw new Error('Job is not in proofing stage')
  if (job.proof_decision) throw new Error('Proof decision already submitted')

  const { error } = await supabase
    .from('jobs')
    .update({ proof_decision: 'changes_requested', proof_comments: comments })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  // Fetch customer info for notification
  const serviceClient = createServiceClient()
  const { data: jobWithCustomer } = await serviceClient
    .from('jobs')
    .select('orders(customers(name, email))')
    .eq('id', jobId)
    .single()

  const order = Array.isArray(jobWithCustomer?.orders)
    ? jobWithCustomer.orders[0]
    : jobWithCustomer?.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers

  await notifyProofDecision(
    jobId,
    job.order_id,
    'changes_requested',
    comments,
    customer?.email ?? '',
    customer?.name ?? ''
  )

  revalidatePath('/portal/orders/' + job.order_id)
  revalidatePath('/dashboard/production')
  revalidatePath('/dashboard/orders/' + job.order_id)
}

export async function resetProofDecision(jobId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: job } = await supabase
    .from('jobs')
    .select('id, order_id, stage')
    .eq('id', jobId)
    .single()

  if (!job) throw new Error('Job not found')
  if (job.stage !== 'proofing') throw new Error('Can only reset proof for jobs in proofing stage')

  const { error } = await supabase
    .from('jobs')
    .update({ proof_decision: null, proof_comments: null })
    .eq('id', jobId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/production')
  revalidatePath('/dashboard/orders/' + job.order_id)
}
