'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripeProvider } from '@/lib/payments/stripe-provider'
import { notifyInvoicePaymentLink } from '@/lib/n8n'
import { getTenantId } from '@/lib/tenant'

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
  if (profile?.role !== 'admin') throw new Error('Admin access required')

  return { supabase, user }
}

export async function createInvoice(orderId: string) {
  const { supabase, user } = await requireAdmin()
  const tenantId = await getTenantId()

  const { data: order } = await supabase
    .from('orders')
    .select('id, total')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Order not found')

  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (existing) throw new Error('Invoice already exists for this order')

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      order_id: orderId,
      amount: order.total,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/orders/${orderId}`)
  revalidatePath('/dashboard/invoices')

  return data
}

export async function markInvoiceSent(invoiceId: string) {
  const { supabase } = await requireAdmin()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('order_id')
    .eq('id', invoiceId)
    .single()

  if (!invoice) throw new Error('Invoice not found')

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'sent' })
    .eq('id', invoiceId)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/invoices/${invoiceId}`)
  revalidatePath(`/dashboard/orders/${invoice.order_id}`)
  redirect(`/dashboard/invoices/${invoiceId}`)
}

export async function deleteInvoice(invoiceId: string) {
  const { supabase } = await requireAdmin()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('order_id, status')
    .eq('id', invoiceId)
    .single()

  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status !== 'draft') throw new Error('Only draft invoices can be deleted')

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/invoices')
  revalidatePath(`/dashboard/orders/${invoice.order_id}`)
  redirect('/dashboard/invoices')
}

export async function sendPaymentLink(invoiceId: string) {
  const { supabase } = await requireAdmin()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, amount, status, order_id, orders(customers(name, email))')
    .eq('id', invoiceId)
    .single()

  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'paid') throw new Error('Cannot send payment link for a paid invoice')

  const order = Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers

  const provider = getStripeProvider()

  const result = await provider.createPaymentLink({
    invoiceId,
    amountCents: Math.round(Number(invoice.amount) * 100),
    description: `Invoice #${invoiceId.slice(0, 8).toUpperCase()}`,
    metadata: { order_id: invoice.order_id },
  })

  const { error } = await supabase
    .from('invoices')
    .update({
      stripe_payment_link_url: result.url,
      stripe_payment_intent_id: result.externalId,
      status: 'sent',
    })
    .eq('id', invoiceId)

  if (error) throw new Error(error.message)

  await notifyInvoicePaymentLink(
    invoiceId,
    customer?.email ?? '',
    customer?.name ?? '',
    result.url
  )

  revalidatePath('/dashboard/invoices/' + invoiceId)
  revalidatePath('/dashboard/orders/' + invoice.order_id)
  redirect('/dashboard/invoices/' + invoiceId)
}
