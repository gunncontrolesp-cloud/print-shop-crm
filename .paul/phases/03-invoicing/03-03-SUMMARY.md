---
phase: 03-invoicing
plan: 03
subsystem: payments
tags: [stripe-webhooks, payment-status-sync, supabase-service-role, dashboard]

requires:
  - phase: 03-invoicing
    plan: 02
    provides: stripe_payment_intent_id = plink_xxx stored on invoice; Stripe + n8n infra in place

provides:
  - /api/webhooks/stripe POST handler with signature verification
  - createServiceClient() — service role Supabase client for webhook use
  - checkout.session.completed → invoice marked 'paid' automatically
  - notifyInvoicePaid n8n helper
  - Dashboard "Unpaid Invoices" stat card (draft + sent count, red accent)

affects: []

tech-stack:
  added: []
  patterns:
    - "createServiceClient() pattern: service role client for trusted server contexts (webhooks) where no user session exists"
    - "Stripe webhook: read raw body as text before any parsing — required for constructEvent signature check"
    - "payment_link field: typeof check before .id access — Stripe type is string | PaymentLink | null"

key-files:
  created:
    - src/app/api/webhooks/stripe/route.ts
  modified:
    - src/lib/supabase/server.ts
    - src/lib/n8n.ts
    - src/app/dashboard/page.tsx
    - .env.local.example

key-decisions:
  - "createServiceClient in server.ts (not a new file) — consistent location; clearly scoped by name"
  - "notifyInvoicePaid placed before notifyInvoicePaymentLink in n8n.ts — logical event order (paid before link-sent in file)"
  - "Duplicate webhook delivery is a no-op — update to 'paid' when already 'paid' is idempotent"

duration: ~15min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 3 Plan 03: Stripe Webhook + Payment Status Sync Summary

**Payment loop closed: Stripe's `checkout.session.completed` event now marks invoices paid, notifies the owner via n8n, and revalidates all relevant pages automatically — Phase 3 complete, order-to-cash flow fully operational.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Tasks | 2 completed |
| Files modified | 5 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Stripe Signature Verified | Pass | constructEvent throws on bad sig → 400; missing sig → 400 |
| AC-2: Invoice Marked Paid | Pass | checkout.session.completed → update status='paid' + revalidatePath |
| AC-3: Owner Notified | Pass | notifyInvoicePaid fired after DB update |
| AC-4: Unknown Payment Link Handled | Pass | console.warn + break; 200 returned so Stripe doesn't retry |
| AC-5: Dashboard Unpaid Alert | Pass | "Unpaid Invoices" stat card (draft+sent count) with red accent |
| AC-6: Missing Stripe Config Non-Blocking | Pass | 500 + console.error when env vars missing |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/supabase/server.ts` | Modified | `createServiceClient()` added — service role, bypasses RLS |
| `src/app/api/webhooks/stripe/route.ts` | Created | Stripe webhook handler |
| `src/lib/n8n.ts` | Modified | `notifyInvoicePaid` appended |
| `src/app/dashboard/page.tsx` | Modified | Unpaid invoices query + stat card |
| `.env.local.example` | Modified | `STRIPE_WEBHOOK_SECRET` + `N8N_WEBHOOK_INVOICE_PAID` added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `createServiceClient` in server.ts | Single place for all Supabase client factories | Clear convention — any new webhook handler imports from same file |
| Duplicate webhook = no-op | Stripe may deliver events more than once; update to 'paid' when already 'paid' is safe | No idempotency key needed |
| `notifyInvoicePaid` fires before revalidatePath | n8n is fire-and-forget; revalidation is local — ordering doesn't matter | Consistent with other helpers |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Phase 3 Complete

All three plans unified:
- ✓ 03-01: Invoice generation + management UI
- ✓ 03-02: PaymentProvider abstraction + Stripe payment links
- ✓ 03-03: Stripe webhook + payment status sync + dashboard alert

**Order-to-cash flow end-to-end:**
Order → Generate Invoice → Send Payment Link → Customer Pays → Invoice Marked Paid → Owner Notified

**Ready for Phase 4:** Customer Portal (order tracking + proof approval + embedded Stripe checkout)

---
*Phase: 03-invoicing, Plan: 03*
*Completed: 2026-03-27*
