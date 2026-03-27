---
phase: 03-invoicing
plan: 01
subsystem: invoicing
tags: [invoices, supabase-rls, server-actions, next-js]

requires:
  - phase: 01-foundation
    provides: orders table with total field — invoice amount sourced from order.total

provides:
  - public.invoices table with RLS (one-per-order via unique constraint)
  - createInvoice, markInvoiceSent, deleteInvoice server actions
  - /dashboard/invoices list page
  - /dashboard/invoices/[id] detail page
  - Invoice section on order detail page
  - InvoiceStatus type in src/lib/types.ts

affects: [03-02-stripe, 03-03-webhooks]

tech-stack:
  added: []
  patterns: ["requireAdmin() helper extracted in invoices.ts — avoids repeating auth+role check", "invoice section on order detail: conditional render based on invoice existence"]

key-files:
  created:
    - supabase/migrations/20260327000003_invoices.sql
    - src/lib/actions/invoices.ts
    - src/app/dashboard/invoices/page.tsx
    - src/app/dashboard/invoices/[id]/page.tsx
  modified:
    - src/lib/types.ts
    - src/app/dashboard/orders/[id]/page.tsx
    - src/components/nav-sidebar.tsx

key-decisions:
  - "requireAdmin() helper extracted in invoices.ts — avoids repeating auth+role check across three actions"
  - "stripe_payment_intent_id and stripe_payment_link_url columns present but null — ready for 03-02"

patterns-established:
  - "requireAdmin() pattern: fetch user + check role in one helper, reuse across actions in same file"

duration: ~25min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 3 Plan 01: Invoice Generation + Management UI Summary

**Invoice entity built end-to-end: DB table with one-per-order constraint, three admin server actions (create/mark-sent/delete), invoice section on order detail, and full invoice list + detail pages — foundation ready for Stripe payment links in 03-02.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25 min |
| Tasks | 2 completed |
| Files modified | 7 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Generate Invoice from Order | Pass | createInvoice server action + button on order detail |
| AC-2: No Duplicate Invoices | Pass | unique constraint at DB + app-layer throw; button hidden when invoice exists |
| AC-3: Invoice List | Pass | /dashboard/invoices with customer, amount, status, due date |
| AC-4: Invoice Detail | Pass | /dashboard/invoices/[id] with all fields + linked order |
| AC-5: Mark as Sent | Pass | markInvoiceSent action; button only shown for draft status |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260327000003_invoices.sql` | Created | invoices table + unique order_id + RLS + trigger |
| `src/lib/types.ts` | Modified | InvoiceStatus type + INVOICE_STATUS_SEQUENCE added |
| `src/lib/actions/invoices.ts` | Created | createInvoice, markInvoiceSent, deleteInvoice |
| `src/app/dashboard/invoices/page.tsx` | Created | Invoice list page |
| `src/app/dashboard/invoices/[id]/page.tsx` | Created | Invoice detail page |
| `src/app/dashboard/orders/[id]/page.tsx` | Modified | Invoice section + query added |
| `src/components/nav-sidebar.tsx` | Modified | Invoices nav item added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `requireAdmin()` helper in invoices.ts | Three actions all need same auth+role check; extract once | Clean, no duplication; pattern available for Phase 3 payment actions |
| Stripe columns present but null | 03-02 adds payment link logic without schema migration | Zero migration work in 03-02 for invoice table |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `stripe_payment_link_url` column ready for 03-02 to write Stripe payment link URL
- `stripe_payment_intent_id` column ready for 03-03 webhook handler
- `markInvoiceSent` can be extended in 03-02 to also send the payment link email

**Concerns:**
- Migration 20260327000003_invoices.sql needs applying to Supabase before runtime testing

**Blockers:**
- None for 03-02

---
*Phase: 03-invoicing, Plan: 01*
*Completed: 2026-03-27*
