---
phase: 04-portal
plan: 02
subsystem: customer-portal
tags: [order-tracking, file-download, s3-presigned-url, rls, portal]

requires:
  - phase: 04-portal
    plan: 01
    provides: auth_user_id linkage + customer RLS on orders/files

provides:
  - createPresignedDownloadUrl server action (RLS-verified, 1hr S3 GET URL)
  - /portal — order list with status badges, totals, dates, view links
  - /portal/orders/[id] — status timeline + downloadable files
  - Portal header "Orders" nav link

affects: [04-03-proof-approval, 04-04-stripe-checkout]

tech-stack:
  added: []
  patterns:
    - "Server component generates all presigned download URLs at page load — 1hr expiry acceptable for portal use"
    - "createPresignedDownloadUrl uses regular client (RLS verified) before signing URL — customer can't download other customers' files"
    - "formatBytes as local utility in order detail page — single use, no abstraction needed"

key-files:
  created:
    - src/app/portal/orders/[id]/page.tsx
  modified:
    - src/lib/actions/files.ts
    - src/app/portal/page.tsx
    - src/app/portal/layout.tsx

key-decisions:
  - "Presigned URLs generated at page load (not on-click) — simpler, 1hr expiry is fine for a portal session"
  - "customer verification via service client in order detail — confirms auth_user_id set before letting RLS take over"
  - "Orders nav link added to layout header — ready for invoice/portal nav expansion in 04-04"

duration: ~15min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 4 Plan 02: Order Tracking + File Download Summary

**Customers can now see all their orders in a table, drill into any order for a visual status timeline, and download attached files via time-limited presigned S3 URLs — the core "where's my order?" loop is closed.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Tasks | 2 completed |
| Files modified | 4 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Customer Sees Their Orders | Pass | RLS-filtered order list table at /portal |
| AC-2: Empty State | Pass | "No orders yet" message shown |
| AC-3: Order Status Timeline | Pass | 6-step progress indicator with filled/current/upcoming states |
| AC-4: Order Files Listed | Pass | name, size, date, Download link per file |
| AC-5: File Download Works | Pass | createPresignedDownloadUrl → 1hr S3 GET URL |
| AC-6: Customer Cannot Access Others' Orders | Pass | RLS + notFound() if order not in result set |
| AC-7: Orders Nav Link | Pass | "Orders" link in portal header |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/actions/files.ts` | Modified | `createPresignedDownloadUrl` appended |
| `src/app/portal/page.tsx` | Modified | Order list table replacing stub card |
| `src/app/portal/orders/[id]/page.tsx` | Created | Order detail: status timeline + file downloads |
| `src/app/portal/layout.tsx` | Modified | "Orders" nav link added to header |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Generate presigned URLs at page load | Simpler than on-click; 1hr expiry ample for portal session | No client-side JS needed for downloads |
| RLS verification in download action | `supabase.from('files').select().eq('id', fileId)` with user session — RLS filters to owned files only | Customer can't craft a fileId to access others' files |

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

**Ready:**
- `/portal/orders/[id]` page exists and renders — 04-03 (proof approval) adds buttons to this page
- Portal layout nav ready for additional links (04-04 will add "Invoices")
- `createPresignedDownloadUrl` available for any future portal file access needs

**Blockers:**
- None for 04-03

---
*Phase: 04-portal, Plan: 02*
*Completed: 2026-03-27*
