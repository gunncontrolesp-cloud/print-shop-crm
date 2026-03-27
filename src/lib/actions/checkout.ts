'use server'

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function createEmbeddedCheckoutSession(invoiceId: string): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // RLS ensures customer only sees their own invoices
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, amount, status')
    .eq('id', invoiceId)
    .single()

  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status !== 'sent') throw new Error('Invoice is not payable')

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY in environment')

  const stripe = new Stripe(stripeKey)

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded_page',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice #${invoiceId.slice(0, 8).toUpperCase()}`,
          },
          unit_amount: Math.round(Number(invoice.amount) * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoices/${invoiceId}/complete?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { invoice_id: invoiceId },
  })

  if (!session.client_secret) throw new Error('Failed to create checkout session')
  return session.client_secret
}
