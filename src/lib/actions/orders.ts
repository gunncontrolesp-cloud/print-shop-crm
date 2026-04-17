'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/lib/types'
import { getNextStatus } from '@/lib/types'
import { notifyOrderApproved, notifyReorder } from '@/lib/n8n'
import { getTenantId } from '@/lib/tenant'

export async function convertQuoteToOrder(quoteId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = await getTenantId()

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, customer_id, line_items, subtotal, status')
    .eq('id', quoteId)
    .single()

  if (!quote) throw new Error('Quote not found')
  if (quote.status !== 'approved') throw new Error('Only approved quotes can be converted to orders')

  // Prevent duplicate conversion
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('quote_id', quoteId)
    .single()

  if (existing) {
    redirect(`/dashboard/orders/${existing.id}`)
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      tenant_id: tenantId,
      quote_id: quoteId,
      customer_id: quote.customer_id,
      line_items: quote.line_items,
      total: quote.subtotal,
      status: 'pending',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/orders')
  revalidatePath(`/dashboard/quotes/${quoteId}`)
  redirect(`/dashboard/orders/${order.id}`)
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch current order status
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .single()

  if (!order) throw new Error('Order not found')

  const expectedNext = getNextStatus(order.status as OrderStatus)
  if (expectedNext !== status) {
    throw new Error(`Invalid status transition: ${order.status} → ${status}`)
  }

  // pending → approved is admin-only
  if (status === 'approved') {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!['admin', 'manager'].includes(profile?.role ?? '')) {
      throw new Error('Only admins or managers can approve orders')
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Auto-create production job when order is approved
  if (status === 'approved') {
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('order_id', id)
      .single()

    if (!existingJob) {
      const jobTenantId = await getTenantId()
      await supabase.from('jobs').insert({
        tenant_id: jobTenantId,
        order_id: id,
        stage: 'design',
      })
    }
  }

  if (status === 'approved') {
    const { data: orderWithCustomer } = await supabase
      .from('orders')
      .select('customers(name, email)')
      .eq('id', id)
      .single()
    const customer = Array.isArray(orderWithCustomer?.customers)
      ? orderWithCustomer.customers[0]
      : orderWithCustomer?.customers
    if (customer?.email) {
      await notifyOrderApproved(id, customer.email, customer.name ?? '')
    }
  }

  revalidatePath(`/dashboard/orders/${id}`)
  revalidatePath('/dashboard/orders')
  redirect(`/dashboard/orders/${id}`)
}

export async function reorderJob(orderId: string) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Resolve portal customer — portal users are in customers, not public.users
  const { data: customer } = await serviceClient
    .from('customers')
    .select('id, name, email, tenant_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!customer) throw new Error('Customer not found')

  // Verify the order belongs to this customer
  const { data: order } = await serviceClient
    .from('orders')
    .select('id, customer_id, line_items, total, status')
    .eq('id', orderId)
    .eq('customer_id', customer.id)
    .single()

  if (!order) throw new Error('Order not found')
  if (!['completed', 'delivered'].includes(order.status)) {
    throw new Error('Can only reorder completed or delivered jobs')
  }

  // Create the reorder quote
  const { data: newQuote, error } = await serviceClient
    .from('quotes')
    .insert({
      tenant_id: customer.tenant_id,
      customer_id: customer.id,
      line_items: order.line_items,
      subtotal: Number(order.total),
      status: 'pending',
      is_reorder: true,
      original_order_id: orderId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await notifyReorder(newQuote.id, customer.name ?? '', customer.email ?? '', orderId)

  revalidatePath('/portal')
  revalidatePath('/dashboard/quotes')
  redirect('/portal?reordered=1')
}

export async function archiveOrder(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Admin only')

  const { error } = await supabase
    .from('orders')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/orders')
  redirect('/dashboard/orders')
}

export async function deleteOrder(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Admin only')

  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/orders')
  redirect('/dashboard/orders')
}
