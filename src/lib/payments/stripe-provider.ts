import Stripe from 'stripe'
import type { PaymentProvider, CreatePaymentLinkParams, PaymentLinkResult } from './provider'

export class StripeProvider implements PaymentProvider {
  constructor(private readonly secretKey: string) {}

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
    const stripe = new Stripe(this.secretKey)

    const link = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: params.description,
            },
            unit_amount: params.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { invoice_id: params.invoiceId, ...params.metadata },
    })

    return { url: link.url!, externalId: link.id }
  }
}

export function getStripeProvider(): StripeProvider {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY in environment')
  }
  return new StripeProvider(secretKey)
}
