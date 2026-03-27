'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { LineItem, OrderStatus } from '@/lib/types'
import { getNextStatus } from '@/lib/types'
import { notifyOrderApproved } from '@/lib/n8n'
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
    if (profile?.role !== 'admin') {
      throw new Error('Only admins can approve orders')
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

export async function deleteOrder(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/orders')
  redirect('/dashboard/orders')
}
