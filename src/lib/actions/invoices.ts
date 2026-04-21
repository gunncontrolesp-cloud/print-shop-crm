'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripeProvider } from '@/lib/payments/stripe-provider'
import { notifyInvoicePaymentLink } from '@/lib/n8n'
import { getTenantId } from '@/lib/tenant'
import { fireAccountingWebhook } from '@/lib/accounting'

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

  const syncStatus = await fireAccountingWebhook(tenantId, 'invoice.created', {
    invoiceId: data.id,
    orderId,
    amount: Number(order.total),
  })
  await supabase
    .from('invoices')
    .update({
      accounting_sync_status: syncStatus,
      accounting_synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
    })
    .eq('id', data.id)

  revalidatePath(`/dashboard/orders/${orderId}`)
  revalidatePath('/dashboard/invoices')

  return data
}

export async function resyncInvoice(
  invoiceId: string
): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdmin()
  const tenantId = await getTenantId()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, order_id, amount, status, orders(customers(name, email))')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return { ok: false, message: 'Invoice not found' }

  const order = Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders
  const customer = Array.isArray(order?.customers) ? order.customers[0] : order?.customers

  const event = invoice.status === 'paid' ? 'invoice.paid' : 'invoice.created'
  const syncStatus = await fireAccountingWebhook(tenantId, event, {
    invoiceId,
    orderId: invoice.order_id,
    amount: Number(invoice.amount),
    customerName: customer?.name ?? '',
    customerEmail: customer?.email ?? '',
  })

  await supabase
    .from('invoices')
    .update({
      accounting_sync_status: syncStatus,
      accounting_synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId)

  revalidatePath('/dashboard/invoices/' + invoiceId)
  revalidatePath('/dashboard/invoices')

  if (syncStatus === 'pending') return { ok: false, message: 'Accounting not enabled — check settings' }
  if (syncStatus === 'failed') return { ok: false, message: 'Webhook failed — check n8n' }
  return { ok: true, message: 'Invoice synced' }
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
  redirect(`/dashboard/invoices/${invoiceId}?flash=invoice_sent`)
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
  redirect('/dashboard/invoices/' + invoiceId + '?flash=payment_link_sent')
}
