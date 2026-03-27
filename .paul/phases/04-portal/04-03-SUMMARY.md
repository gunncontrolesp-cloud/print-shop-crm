---
phase: 04-portal
plan: 03
subsystem: customer-portal
tags: [proof-approval, server-actions, rls, production-board, n8n]

requires:
  - phase: 04-portal
    plan: 02
    provides: /portal/orders/[id] page exists; customer job SELECT RLS needed

provides:
  - proof_decision + proof_comments columns on jobs
  - Customer SELECT + UPDATE RLS on jobs (for proof stage)
  - approveProof, requestProofChanges, resetProofDecision server actions
  - notifyProofDecision n8n helper
  - Portal order detail: proof approval section (approve button + request changes form)
  - Production board: proof decision badge + Reset Proof button

affects: [04-04-stripe-checkout]

tech-stack:
  added: []
  patterns:
    - "FormData pattern: requestProofChanges(jobId, formData) — bind(null, jobId) for extra arg, FormData for textarea"
    - "maybeSingle() on job query — order may not have entered production yet; null handled gracefully"
    - "Service client for notification lookup after customer RLS update — customer session can't see all join data needed for n8n payload"

key-files:
  created:
    - supabase/migrations/20260327000005_proof_approvals.sql
    - src/lib/actions/proof.ts
  modified:
    - src/lib/n8n.ts
    - src/app/portal/orders/[id]/page.tsx
    - src/components/production-board.tsx
    - .env.local.example

key-decisions:
  - "Pure server forms for proof approval — no client component needed; textarea works fine as server form field"
  - "Service client for n8n notification lookup — after customer updates the job, need admin-level query to get customer email from the join"
  - "Production board wildcard select (*) picks up proof columns automatically — no page.tsx change needed"

duration: ~20min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 4 Plan 03: Proof Approval Workflow Summary

**Proof approval loop complete: customers approve or request changes from their portal, admin is notified instantly via n8n, production board shows proof decision in real-time, and admin can reset for another round after making changes.**

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
| AC-1: Customer Approves Proof | Pass | approveProof → proof_decision='approved' + stage='printing' + n8n notify |
| AC-2: Customer Requests Changes | Pass | requestProofChanges → proof_decision='changes_requested' + comments + n8n notify |
| AC-3: One Decision Per Proof Round | Pass | proof_decision IS NULL check in action + RLS USING clause |
| AC-4: Production Board Shows Proof Decision | Pass | Badges on proofing column cards; Realtime picks up changes |
| AC-5: Admin Can Reset Proof Decision | Pass | Reset Proof button → resetProofDecision action |
| AC-6: No Proof Section When Not in Proofing | Pass | `{job?.stage === 'proofing' && ...}` conditional |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260327000005_proof_approvals.sql` | Created | proof columns + customer job RLS |
| `src/lib/actions/proof.ts` | Created | approveProof, requestProofChanges, resetProofDecision |
| `src/lib/n8n.ts` | Modified | notifyProofDecision appended |
| `src/app/portal/orders/[id]/page.tsx` | Modified | Job query + proof section added |
| `src/components/production-board.tsx` | Modified | Job type + proof badge + Reset Proof button |
| `.env.local.example` | Modified | N8N_WEBHOOK_PROOF_DECISION added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| FormData for requestProofChanges | bind(null, jobId) + FormData textarea = server form, no JS needed | Zero client-side code for proof workflow |
| Service client for n8n notification | Customer session can SELECT their job but not deeply nested joins needed for email | Clean separation: customer action → service lookup → notify |
| maybeSingle() on job query | Order may not have production job yet (pre-production orders) | Graceful null handling, no error thrown |

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

**Ready:**
- Proof approval complete — portal order detail page is fully functional
- 04-04 (embedded Stripe checkout) adds invoice payment to the portal
- Portal layout "Orders" nav ready; 04-04 may add "Invoices" nav link

**Blockers:**
- None for 04-04

---
*Phase: 04-portal, Plan: 03*
*Completed: 2026-03-27*
