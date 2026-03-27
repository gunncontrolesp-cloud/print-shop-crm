'use server'

import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/tenant'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER_ID!,
  pro: process.env.STRIPE_PRICE_PRO_ID!,
  premium: process.env.STRIPE_PRICE_PREMIUM_ID!,
}

export async function createSubscriptionCheckout() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = await getTenantId()
  const service = createServiceClient()

  const { data: tenant } = await service
    .from('tenants')
    .select('name, plan_tier, stripe_customer_id')
    .eq('id', tenantId)
    .single()

  if (!tenant) throw new Error('Tenant not found')

  const stripe = getStripe()

  // Create Stripe customer if not yet linked
  let customerId = tenant.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      email: user.email,
      metadata: { tenant_id: tenantId },
    })
    customerId = customer.id

    await service
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantId)
  }

  const priceId = PRICE_IDS[tenant.plan_tier]
  if (!priceId) throw new Error(`No price configured for tier: ${tenant.plan_tier}`)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/subscribe?cancelled=1`,
    metadata: { tenant_id: tenantId, plan_tier: tenant.plan_tier },
  })

  if (!session.url) throw new Error('Failed to create checkout session')
  redirect(session.url)
}

export async function createBillingPortalSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const tenantId = await getTenantId()
  const service = createServiceClient()

  const { data: tenant } = await service
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.stripe_customer_id) throw new Error('No billing account found')

  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/pricing`,
  })

  redirect(session.url)
}
