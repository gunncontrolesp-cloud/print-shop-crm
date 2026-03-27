---
phase: 01-foundation
plan: 05
type: summary
completed: 2026-03-27
---

# Plan 01-05 Summary: Dashboard + Phase 1 Close

## What Was Built

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `src/app/dashboard/page.tsx` | Replaced stub | Live stat cards, recent orders list, open quotes panel, quick actions |
| `src/app/page.tsx` | Fixed | Root `/` now redirects to `/dashboard` instead of rendering placeholder |
| `src/app/layout.tsx` | Updated | `suppressHydrationWarning` on both `<html>` and `<body>`; page metadata updated |
| `src/components/ui/button-variants.ts` | Created | Extracted `buttonVariants` cva to non-client file so Server Components can import it |
| `src/components/ui/button.tsx` | Updated | Now imports `buttonVariants` from `button-variants.ts` |
| All 6 dashboard page files | Updated | Import `buttonVariants` from `@/components/ui/button-variants` |
| All 6 dashboard page files | Updated | `toLocaleDateString()` → `toLocaleDateString('en-US')` (hydration fix) |
| `supabase/migrations/20260326000005_fix_rls_recursion.sql` | Created | Fixes infinite recursion across all RLS policies via SECURITY DEFINER helpers |
| `src/app/dashboard/quotes/new/page.tsx` | Updated | Graceful warning when pricing_config is missing instead of crash |
| `src/components/quote-line-item-form.tsx` | Updated | Optional chaining guard on config arrays |

### Features Delivered

- **Dashboard**: 4 stat cards (customers, open orders, pending approval, in production), recent orders table with status badges, open quotes count, quick action buttons
- **Root redirect**: `/` → `/dashboard` → `/login` (if unauthenticated)

### Bugs Fixed During Testing

| Bug | Fix |
|-----|-----|
| `Cannot read properties of undefined (reading '0')` on quote builder | Added null guard + warning banner when pricing_config missing |
| `buttonVariants is on the client` error in server components | Extracted to `button-variants.ts` without `"use client"` |
| `toLocaleDateString()` hydration mismatch | Pinned locale to `'en-US'` on all 6 pages |
| Body/html hydration mismatch from browser extensions | `suppressHydrationWarning` on both root tags |
| RLS infinite recursion on `public.users` | Migration 000005: SECURITY DEFINER helper functions `is_authenticated()` and `is_admin()` |
| Root page showing placeholder button instead of redirecting | Replaced with `redirect('/dashboard')` |

## Decisions

| Decision | Rationale |
|----------|-----------|
| `button-variants.ts` split from `button.tsx` | Next.js 16 enforces server/client boundary strictly — any function in a `"use client"` file cannot be called from server components |
| `is_authenticated()` + `is_admin()` SECURITY DEFINER functions | Supabase RLS policies cannot subquery the same table they protect; SECURITY DEFINER bypasses RLS in the helper, breaking the recursion |

## Phase 1 Complete

All 5 plans shipped. Full lifecycle functional: Customer → Quote → Order → Status workflow. Dashboard shows live state. Build: clean.

## Next

Phase 2: Production + Files + Notifications
- 02-01: Jobs table + Production board (Supabase Realtime Kanban)
- 02-02: File upload system (S3 presigned URLs)
- 02-03: n8n Cloud automation flows (email + SMS)
