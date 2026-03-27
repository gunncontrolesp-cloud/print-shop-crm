---
phase: 03-invoicing
plan: 02
subsystem: payments
tags: [stripe, payment-links, payment-provider-abstraction, server-actions, n8n]

requires:
  - phase: 03-invoicing
    plan: 01
    provides: invoices table with stripe_payment_link_url + stripe_payment_intent_id columns ready

provides:
  - PaymentProvider interface (src/lib/payments/provider.ts)
  - StripeProvider implementation + getStripeProvider() factory
  - sendPaymentLink server action
  - notifyInvoicePaymentLink n8n helper
  - "Send Payment Link" button on invoice detail page
  - Payment link URL display on invoice detail page

affects: [03-03-webhooks]

tech-stack:
  added: [stripe (npm package)]
  patterns:
    - "PaymentProvider interface pattern — Stripe swappable for PayPal/Clover without touching invoices.ts"
    - "getStripeProvider() factory throws with clear message when STRIPE_SECRET_KEY missing"
    - "Array.isArray() guard applied to orders/customers join in sendPaymentLink"

key-files:
  created:
    - src/lib/payments/provider.ts
    - src/lib/payments/stripe-provider.ts
  modified:
    - src/lib/actions/invoices.ts
    - src/lib/n8n.ts
    - src/app/dashboard/invoices/[id]/page.tsx
    - .env.local.example

key-decisions:
  - "sendPaymentLink allows re-send if status='sent' — creates a new Stripe link; useful if customer loses the original email"
  - "fire-and-forget pattern for notifyInvoicePaymentLink — non-blocking, consistent with other n8n helpers"
  - "stripe_payment_intent_id stores the Stripe payment link ID (plink_xxx) — reused in 03-03 for webhook matching"

duration: ~20min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 3 Plan 02: PaymentProvider Abstraction + Stripe Implementation Summary

**PaymentProvider interface and Stripe implementation built: admin can click "Send Payment Link" to generate a Stripe hosted payment page, store the URL on the invoice, and notify the customer via n8n — abstraction layer ready for PayPal/Clover in Phase 6.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 2 completed |
| Files modified | 6 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Payment Link Generated | Pass | sendPaymentLink creates Stripe link, updates invoice.stripe_payment_link_url + status='sent' |
| AC-2: Customer Notified | Pass | notifyInvoicePaymentLink fired after invoice update |
| AC-3: Payment Link Displayed | Pass | "Open Stripe →" link shown when stripe_payment_link_url set |
| AC-4: PaymentProvider is Swappable | Pass | PaymentProvider interface defined; invoices.ts depends only on interface |
| AC-5: Missing Stripe Config is Non-Blocking at Type Level | Pass | getStripeProvider() throws 'Stripe is not configured' when key missing |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/payments/provider.ts` | Created | PaymentProvider interface + CreatePaymentLinkParams + PaymentLinkResult types |
| `src/lib/payments/stripe-provider.ts` | Created | StripeProvider class + getStripeProvider() factory |
| `src/lib/actions/invoices.ts` | Modified | sendPaymentLink action appended |
| `src/lib/n8n.ts` | Modified | notifyInvoicePaymentLink helper appended |
| `src/app/dashboard/invoices/[id]/page.tsx` | Modified | "Send Payment Link" button (draft+sent) + payment link URL row |
| `.env.local.example` | Modified | STRIPE_SECRET_KEY + N8N_WEBHOOK_INVOICE_PAYMENT_LINK added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Allow re-send on 'sent' status | Customer may lose email; new link replaces old | Button shown for both draft and sent |
| stripe_payment_intent_id stores plink_xxx | 03-03 webhook handler needs this to match Stripe events to invoices | No schema change needed in 03-03 |
| Fire-and-forget for n8n notify | Consistent with all other n8n helpers; payment link creation already succeeded | n8n failure never blocks the admin action |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `stripe_payment_intent_id` stores the Stripe payment link ID — 03-03 webhook handler can match `payment_intent.succeeded` events to invoices
- `stripe_payment_link_url` populated and displayed — customer receives link via n8n email
- PaymentProvider abstraction in place — Phase 6 SaaS can inject different providers per tenant

**Concerns:**
- STRIPE_SECRET_KEY must be set in `.env.local` before `sendPaymentLink` can execute at runtime

**Blockers:**
- None for 03-03

---
*Phase: 03-invoicing, Plan: 02*
*Completed: 2026-03-27*
