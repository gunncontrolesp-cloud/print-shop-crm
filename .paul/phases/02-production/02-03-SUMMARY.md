---
phase: 02-production
plan: 03
subsystem: notifications
tags: [n8n, webhooks, email, sms, twilio]

requires:
  - phase: 02-production
    provides: jobs table (ready_for_pickup stage), orders, quotes — all event sources

provides:
  - notifyN8n / notifyQuoteSent / notifyOrderApproved / notifyJobReady utility
  - quote.sent, order.approved, job.ready_for_pickup outbound webhook events
  - /api/webhooks/n8n inbound route (Phase 3 scaffold)

affects: [03-invoicing-payments]

tech-stack:
  added: []
  patterns: ["fire-and-forget n8n webhook (try/catch, never throws)", "notification calls additive — after revalidatePath, before redirect"]

key-files:
  created:
    - src/lib/n8n.ts
    - src/app/api/webhooks/n8n/route.ts
  modified:
    - src/lib/actions/quotes.ts
    - src/lib/actions/orders.ts
    - src/lib/actions/jobs.ts
    - .env.local.example

key-decisions:
  - "notifyN8n is a plain module (not 'use server') — imported by server actions, not a server action itself"
  - "Notification placement: after Supabase update + revalidatePath, before redirect — failure never blocks"

patterns-established:
  - "All n8n calls wrapped in try/catch — console.error on failure, never throw"
  - "Customer data fetched via Supabase join at notification time (not passed in from client)"

duration: ~20min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 2 Plan 03: n8n Cloud Automation Flows Summary

**n8n Cloud notification hooks wired into three CRM lifecycle events (quote sent, order approved, job ready for pickup) via a fire-and-forget webhook utility — plus an inbound `/api/webhooks/n8n` route with shared secret validation scaffolded for Phase 3 payment confirmation.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 3 completed |
| Files modified | 6 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Quote sent notification | Pass | notifyQuoteSent called in updateQuoteStatus when status === 'sent' |
| AC-2: Order approved notification | Pass | notifyOrderApproved called in updateOrderStatus when status === 'approved' |
| AC-3: Ready for pickup notification | Pass | notifyJobReady called in updateJobStage when stage === 'ready_for_pickup' |
| AC-4: Failures are non-blocking | Pass | notifyN8n try/catch — console.error, never throws |
| AC-5: Inbound route validates secret | Pass | 401 on missing/wrong secret, 200 on valid; payment.confirmed case scaffolded |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/n8n.ts` | Created | notifyN8n + three typed helper functions |
| `src/app/api/webhooks/n8n/route.ts` | Created | Inbound webhook with secret validation, Phase 3 scaffold |
| `src/lib/actions/quotes.ts` | Modified | notifyQuoteSent on status → 'sent' |
| `src/lib/actions/orders.ts` | Modified | notifyOrderApproved on status → 'approved' |
| `src/lib/actions/jobs.ts` | Modified | notifyJobReady on stage → 'ready_for_pickup' |
| `.env.local.example` | Modified | N8N_WEBHOOK_SECRET + 3 URL placeholders |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `src/lib/n8n.ts` is a plain module, not `'use server'` | Server actions import it directly; no need for it to be a server action itself | Clean separation — utility vs action boundary |
| Customer data fetched at notification time via Supabase join | Server actions have access to Supabase client; cleaner than passing customer through call chain | One query per notification event, no prop drilling |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Phase 2 complete — all three plans done
- n8n infrastructure in place; Twilio SMS configured on n8n Cloud side (no CRM code needed)
- Inbound webhook route ready for Phase 3 `payment.confirmed` handler

**Concerns:**
- n8n webhook URLs and secret must be set in `.env.local` before notifications fire at runtime
- Customer `phone` field may be null for older records — `notifyJobReady` passes `null` gracefully

**Blockers:**
- None for Phase 3

---
*Phase: 02-production, Plan: 03*
*Completed: 2026-03-27*
