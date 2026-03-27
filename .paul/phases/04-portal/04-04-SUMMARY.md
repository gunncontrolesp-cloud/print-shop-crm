---
phase: 04-portal
plan: 04
subsystem: customer-portal
tags: [stripe-embedded-checkout, portal-invoices, webhook, stripe-v21]

requires:
  - phase: 04-portal
    plan: 03
    provides: /portal/orders/[id] page exists; customer RLS on jobs

provides:
  - createEmbeddedCheckoutSession server action (checkout.ts)
  - StripeEmbeddedCheckout client component (portal/embedded-checkout.tsx)
  - /portal/invoices page (invoice list with Pay Now link)
  - /portal/invoices/[id]/pay page (embedded checkout render)
  - /portal/invoices/[id]/complete page (success confirmation)
  - Portal layout Invoices nav link
  - Webhook session.metadata.invoice_id fallback for embedded sessions
  - Portal invoice path revalidation in webhook

affects: [05-sms-notifications]

tech-stack:
  added: [@stripe/stripe-js, @stripe/react-stripe-js]
  patterns:
    - "Stripe v21 ui_mode: 'embedded_page' — not 'embedded'; SDK renamed the value"
    - "EmbeddedCheckoutProvider + EmbeddedCheckout from @stripe/react-stripe-js — client component wraps server-created clientSecret"
    - "Webhook dual-path lookup: payment_link first (Phase 3), then metadata.invoice_id fallback (Phase 4)"
    - "Pay page guards status !== 'sent' → redirect to /portal/invoices before creating Stripe session"

key-files:
  created:
    - src/lib/actions/checkout.ts
    - src/components/portal/embedded-checkout.tsx
    - src/app/portal/invoices/page.tsx
    - src/app/portal/invoices/[id]/pay/page.tsx
    - src/app/portal/invoices/[id]/complete/page.tsx
  modified:
    - src/app/portal/layout.tsx
    - src/app/api/webhooks/stripe/route.ts
    - .env.local.example

key-decisions:
  - "Stripe v21 ui_mode='embedded_page' — TypeScript error revealed the renamed value; 'embedded' no longer valid in SDK types"
  - "Pay page status guard before session creation — createEmbeddedCheckoutSession also guards, but redirect at page level avoids error boundary"
  - "complete page shows 'submitted' not 'paid' — webhook processes async; avoids race condition where page loads before webhook fires"

duration: ~20min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 4 Plan 04: Embedded Stripe Checkout Summary

**Customer portal payment complete: customers can pay invoices inline via Stripe Embedded Checkout — no redirect, no context switch. Both Phase 3 Payment Links and Phase 4 embedded sessions route through the same webhook to mark invoices paid. Phase 4 complete.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 3 completed |
| Files created | 5 |
| Files modified | 3 |
| Deviations | 1 (Stripe v21 renamed ui_mode value) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Invoice List in Portal | Pass | /portal/invoices lists invoices; Pay Now on 'sent'; Paid badge on 'paid' |
| AC-2: Embedded Checkout Renders | Pass | StripeEmbeddedCheckout client component renders EmbeddedCheckout inline |
| AC-3: Return to Portal After Payment | Pass | /portal/invoices/[id]/complete shows success + links back |
| AC-4: Webhook Handles Embedded Checkout | Pass | metadata.invoice_id fallback after payment_link lookup |
| AC-5: Cannot Pay Draft or Paid Invoices | Pass | status !== 'sent' → Error in action + redirect at page level |
| AC-6: Invoices Nav in Portal Header | Pass | "Invoices" link added to portal layout nav |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/actions/checkout.ts` | Created | createEmbeddedCheckoutSession server action |
| `src/components/portal/embedded-checkout.tsx` | Created | StripeEmbeddedCheckout 'use client' wrapper |
| `src/app/portal/invoices/page.tsx` | Created | Customer invoice list with Pay Now + status badges |
| `src/app/portal/invoices/[id]/pay/page.tsx` | Created | Payment page — server creates session, renders client component |
| `src/app/portal/invoices/[id]/complete/page.tsx` | Created | Post-payment success confirmation |
| `src/app/portal/layout.tsx` | Modified | Invoices nav link added |
| `src/app/api/webhooks/stripe/route.ts` | Modified | metadata.invoice_id fallback + portal path revalidation |
| `.env.local.example` | Modified | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| ui_mode: 'embedded_page' | Stripe v21 renamed 'embedded' → 'embedded_page'; TypeScript types caught this | Correct API call; documents SDK version break |
| complete page says "submitted" not "paid" | Webhook is async; page load races webhook processing | No stale "unpaid" flash; user still gets confirmation |
| Status guard at page layer before action | createEmbeddedCheckoutSession also guards, but redirecting before session creation is cleaner UX | No error boundary needed for already-paid invoices |

## Deviations from Plan

| Deviation | Cause | Resolution |
|-----------|-------|-----------|
| ui_mode: 'embedded_page' not 'embedded' | Stripe v21 renamed the embedded mode value | Used correct type per Stripe SDK; plan used deprecated value |

## Phase 4 Complete

All 4 plans delivered:
- **04-01**: Customer auth (magic link) + portal scaffold
- **04-02**: Portal order list + order detail + file downloads
- **04-03**: Proof approval workflow
- **04-04**: Embedded Stripe invoice payment ✓

**Ready for Phase 5: SMS Notifications**

---
*Phase: 04-portal, Plan: 04*
*Completed: 2026-03-27*
