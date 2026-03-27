---
phase: 02-production
plan: 01
type: summary
completed: 2026-03-26
---

# Plan 02-01 Summary: Production Board + Supabase Realtime

## What Was Built

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `supabase/migrations/20260327000001_jobs.sql` | Created | `jobs` table with 5-stage check constraint, RLS policies, Realtime publication, updated_at trigger |
| `src/lib/types.ts` | Updated | Added `JOB_STAGE_SEQUENCE` and `JobStage` exports |
| `src/lib/actions/jobs.ts` | Created | `updateJobStage` (validates next-step sequence), `completeJob` (sets completed_at) |
| `src/lib/actions/orders.ts` | Updated | Auto-creates job at stage `'design'` when order is approved (skips if job already exists) |
| `src/components/production-board.tsx` | Created | `'use client'` Kanban board with Supabase Realtime subscription |
| `src/app/dashboard/production/page.tsx` | Created | Server component — fetches active jobs with order + customer joins |
| `src/components/nav-sidebar.tsx` | Updated | Added `Production` nav item between Orders and Settings |

### Features Delivered

- **Jobs table**: `public.jobs` with stage enum check constraint (design/proofing/printing/finishing/ready_for_pickup), RLS via `is_authenticated()` / `is_admin()` helpers, Realtime publication enabled
- **Auto-job creation**: Approving an order via `updateOrderStatus` now auto-inserts a job at stage `design` (idempotent — skips if job already exists for that order)
- **Stage advancement**: `updateJobStage` validates the transition is exactly one step forward in the sequence before updating
- **Job completion**: `completeJob` sets `completed_at = now()` — board excludes completed jobs by default
- **Production board**: 5-column Kanban grid; each job card shows customer name, truncated order ID, line item count, date; "Move to [next stage]" and "Mark Complete" buttons
- **Realtime**: Supabase `postgres_changes` subscription on `jobs` table — INSERT/UPDATE/DELETE all handled; board updates live without page reload
- **Nav**: "Production" item in sidebar, active when visiting `/dashboard/production`

## Decisions

| Decision | Rationale |
|----------|-----------|
| Click handlers call server actions directly (no `<form>`) | Client component calling imported server actions via `onClick` is valid — avoids wrapping each button in a form |
| INSERT Realtime payload accepted as-is (missing customer name) | Join data not available in Realtime payload; card shows "Unknown" until next server refresh — acceptable for MVP |
| `completed_at` filter applied server-side at page load | Completed jobs excluded from initial fetch; Realtime DELETE handler also removes them when `completeJob` fires and Realtime notifies |

## Verification

- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run build` — zero errors, `/dashboard/production` in route list
- [x] Migration file `20260327000001_jobs.sql` created with valid SQL
- [x] `src/lib/types.ts` exports `JOB_STAGE_SEQUENCE` and `JobStage`
- [x] `updateOrderStatus` creates job on approval
- [x] Nav sidebar shows "Production" item
- [x] `ProductionBoard` uses browser Supabase client (`@/lib/supabase/client`)
- [x] Empty columns render without errors

## Next

Phase 2 Plan 02: File upload system (S3 presigned URLs)
