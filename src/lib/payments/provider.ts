export interface CreatePaymentLinkParams {
  invoiceId: string
  amountCents: number      // amount in cents (e.g. $12.50 → 1250)
  description: string      // shown on Stripe payment page
  metadata?: Record<string, string>
}

export interface PaymentLinkResult {
  url: string        // the hosted payment page URL
  externalId: string // Stripe payment link ID (e.g. plink_xxx)
}

export interface PaymentProvider {
  createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult>
}
