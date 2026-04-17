import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyInvoicePaid } from '@/lib/n8n'
import { fireAccountingWebhook } from '@/lib/accounting'

function planTierFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PREMIUM_ID) return 'premium'
  if (priceId === process.env.STRIPE_PRICE_PRO_ID) return 'pro'
  return 'starter'
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!webhookSecret || !stripeKey) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not configured')
    return Response.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error(
      '[stripe webhook] Signature verification failed:',
      err instanceof Error ? err.message : err
    )
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const supabase = createServiceClient()

      // ── Subscription checkout (Phase 6) ──────────────────────────────────
      if (session.mode === 'subscription') {
        const tenantId = session.metadata?.tenant_id
        if (!tenantId) {
          console.warn('[stripe webhook] subscription session missing tenant_id metadata')
          break
        }
        const planTier = session.metadata?.plan_tier ?? 'starter'
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null

        await supabase
          .from('tenants')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_tier: planTier,
          })
          .eq('id', tenantId)

        break
      }

      // ── Invoice payment (Phase 3/4) ───────────────────────────────────────

      // Try payment link first (Phase 3 Payment Links)
      const paymentLinkId =
        typeof session.payment_link === 'string'
          ? session.payment_link
          : session.payment_link?.id ?? null

      type InvoiceRow = { id: string; order_id: string; orders: unknown }
      let invoice: InvoiceRow | null = null

      if (paymentLinkId) {
        const { data } = await supabase
          .from('invoices')
          .select('id, order_id, orders(customers(name, email))')
          .eq('stripe_payment_intent_id', paymentLinkId)
          .single()
        invoice = data
      }

      // Fallback: embedded checkout session metadata (Phase 4)
      if (!invoice && session.metadata?.invoice_id) {
        const { data } = await supabase
          .from('invoices')
          .select('id, order_id, orders(customers(name, email))')
          .eq('id', session.metadata.invoice_id)
          .single()
        invoice = data
      }

      if (!invoice) {
        console.warn('[stripe webhook] No invoice found for session:', session.id)
        break
      }

      await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoice.id)

      const order = Array.isArray(invoice.orders) ? invoice.orders[0] : invoice.orders
      const typedOrder = order as { customers?: { name: string; email: string } | { name: string; email: string }[] } | null
      const customer = Array.isArray(typedOrder?.customers)
        ? typedOrder!.customers[0]
        : typedOrder?.customers

      await notifyInvoicePaid(invoice.id, customer?.email ?? '', customer?.name ?? '')

      // Fire accounting webhook if configured for this tenant
      const { data: invoiceRow } = await supabase
        .from('invoices')
        .select('tenant_id, amount')
        .eq('id', invoice.id)
        .single()
      if (invoiceRow?.tenant_id) {
        const syncStatus = await fireAccountingWebhook(invoiceRow.tenant_id, 'invoice.paid', {
          invoiceId: invoice.id,
          orderId: invoice.order_id,
          amount: Number(invoiceRow.amount),
          customerName: customer?.name ?? '',
          customerEmail: customer?.email ?? '',
        })
        await supabase
          .from('invoices')
          .update({
            accounting_sync_status: syncStatus,
            accounting_synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
          })
          .eq('id', invoice.id)
      }

      revalidatePath('/dashboard/invoices/' + invoice.id)
      revalidatePath('/dashboard/orders/' + invoice.order_id)
      revalidatePath('/dashboard/invoices')
      revalidatePath('/dashboard')
      revalidatePath('/portal/invoices/' + invoice.id)
      revalidatePath('/portal/invoices')
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

      const priceId = subscription.items.data[0]?.price?.id ?? ''
      const planTier = planTierFromPriceId(priceId)

      const supabase = createServiceClient()
      await supabase
        .from('tenants')
        .update({ plan_tier: planTier, stripe_subscription_id: subscription.id })
        .eq('stripe_customer_id', customerId)

      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

      const supabase = createServiceClient()
      await supabase
        .from('tenants')
        .update({ plan_tier: 'starter', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId)

      break
    }

    default:
      // silently ignore — Stripe sends many event types
  }

  return Response.json({ received: true }, { status: 200 })
}
