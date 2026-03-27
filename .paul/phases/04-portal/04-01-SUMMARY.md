---
phase: 04-portal
plan: 01
subsystem: customer-portal
tags: [supabase-auth, magic-link, rls, portal-scaffold, middleware]

requires:
  - phase: 03-invoicing
    provides: invoices table with customer data accessible once RLS extended

provides:
  - customers.auth_user_id column (UNIQUE FK to auth.users)
  - Customer RLS policies on customers/orders/invoices/files
  - handle_new_user trigger updated (skips public.users for is_customer portal signups)
  - /portal/login — magic link login page
  - /portal/auth/callback — Supabase auth code exchange
  - /portal/layout.tsx — portal shell with header + sign out
  - /portal/page.tsx — portal home with auto-link + welcome card
  - Middleware: /portal/* route protection

affects: [04-02-order-tracking, 04-03-proof-approval, 04-04-stripe-checkout]

tech-stack:
  added: []
  patterns:
    - "Magic link with is_customer metadata — handle_new_user trigger skips staff record for portal users"
    - "Auto-link by email on first portal visit — service client writes auth_user_id without user needing to do anything"
    - "Portal layout uses service client for customer lookup — needed before auth_user_id is set on first visit"

key-files:
  created:
    - supabase/migrations/20260327000004_customer_portal.sql
    - src/app/portal/login/page.tsx
    - src/app/portal/auth/callback/route.ts
    - src/app/portal/layout.tsx
    - src/app/portal/page.tsx
  modified:
    - src/lib/supabase/middleware.ts
    - .env.local.example

key-decisions:
  - "is_customer metadata in OTP prevents customers from being added to public.users staff table"
  - "Auto-link by email is secure because magic link proves email ownership (Supabase verified)"
  - "Portal layout uses service client for customer lookup — regular client can't read customers before auth_user_id is set"

duration: ~20min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 4 Plan 01: Customer Auth + Portal Scaffold Summary

**Customer portal live: magic link login, auto-link to customer record by email on first visit, isolated portal layout — foundation ready for order tracking and proof approval.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 2 completed |
| Files modified | 7 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Magic Link Sent | Pass | signInWithOtp with is_customer metadata + emailRedirectTo |
| AC-2: Auth Callback | Pass | /portal/auth/callback exchanges code + redirects to /portal |
| AC-3: Auto-Link on First Visit | Pass | service client matches email → writes auth_user_id |
| AC-4: Portal Route Protection | Pass | middleware: unauthenticated /portal/* → /portal/login |
| AC-5: Customer RLS | Pass | policies on customers/orders/invoices/files in migration |
| AC-6: Portal Users Not in Staff Table | Pass | trigger skips insert when is_customer=true |
| AC-7: Unlinked Customer Message | Pass | "Your account isn't linked yet" shown if no email match |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260327000004_customer_portal.sql` | Created | auth_user_id + customer RLS + trigger update |
| `src/app/portal/login/page.tsx` | Created | Magic link login form |
| `src/app/portal/auth/callback/route.ts` | Created | Code exchange → session |
| `src/app/portal/layout.tsx` | Created | Portal shell: header + customer name + sign out |
| `src/app/portal/page.tsx` | Created | Portal home: auto-link + welcome card |
| `src/lib/supabase/middleware.ts` | Modified | Portal route protection added |
| `.env.local.example` | Modified | NEXT_PUBLIC_APP_URL added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `is_customer` metadata in OTP | Prevents portal users appearing as staff in `public.users` | Clean role separation at DB layer |
| Auto-link by email | No admin action needed; magic link proves email ownership | Zero friction for first customer login |
| Service client in portal layout | Customer lookup needed before auth_user_id is set (first visit) | Layout shows customer name immediately after auto-link |

## Deviations from Plan

None — plan executed exactly as written.

Note: `npx tsc --noEmit` showed stale `.next/dev/types` errors on first run (route cache not yet regenerated). `npm run build` regenerated types; subsequent `tsc --noEmit` passed clean.

## Next Phase Readiness

**Ready:**
- `auth_user_id` set after first portal login — all subsequent portal pages can use regular client with customer RLS
- Customer RLS on orders/invoices/files in place — 04-02 queries work immediately
- Portal layout shell ready — 04-02 adds nav links to the header

**Concerns:**
- `NEXT_PUBLIC_APP_URL` must be set correctly in `.env.local` — wrong URL breaks magic link redirect
- Migration 20260327000004 must be applied to Supabase before portal is usable

**Blockers:**
- None for 04-02

---
*Phase: 04-portal, Plan: 01*
*Completed: 2026-03-27*
