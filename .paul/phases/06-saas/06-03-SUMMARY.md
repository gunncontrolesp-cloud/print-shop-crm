---
phase: 06-saas
plan: 03
type: summary
status: complete
completed: 2026-03-27
---

# Summary: 06-03 Stripe Subscription Billing + Tier Gates

## What Was Built

### New File: `src/lib/actions/billing.ts`
- `createSubscriptionCheckout()` — creates Stripe customer (if not yet linked), stores `stripe_customer_id` on tenant immediately, creates Stripe Checkout session (subscription mode) with correct price ID from env, redirects to Stripe hosted page
- `createBillingPortalSession()` — creates Stripe Customer Portal session, redirects admin to Stripe's subscription management UI
- Price ID env vars: `STRIPE_PRICE_STARTER_ID`, `STRIPE_PRICE_PRO_ID`, `STRIPE_PRICE_PREMIUM_ID`

### New File: `src/app/onboarding/subscribe/page.tsx`
- Server component — auto-initiates Stripe checkout on first visit (calls `createSubscriptionCheckout()` directly)
- If `?cancelled=1` query param: shows "Subscription required" screen with retry button

### Updated: `src/lib/actions/onboarding.ts`
- Changed `redirect('/dashboard')` → `redirect('/onboarding/subscribe')` so new shops go through checkout before accessing the app

### Updated: `src/app/api/webhooks/stripe/route.ts`
- `checkout.session.completed` now discriminates by `session.mode`:
  - `mode === 'subscription'` → updates `tenants` with `stripe_customer_id`, `stripe_subscription_id`, `plan_tier` from metadata
  - `mode === 'payment'` → existing invoice payment logic (unchanged)
- New case `customer.subscription.updated` → maps Stripe price ID → tier, updates `tenants.plan_tier`
- New case `customer.subscription.deleted` → downgrades `tenants.plan_tier` to `'starter'`, clears `stripe_subscription_id`
- `planTierFromPriceId()` helper: maps env price IDs to tier strings

### Updated: `src/lib/supabase/middleware.ts`
- Dashboard block extended: after tenant check, fetches `plan_tier` from `public.tenants` for gated routes only
- Pro+ gate: `/dashboard/production`, `/dashboard/invoices` — redirects `starter` → `/dashboard/upgrade`
- Premium gate: `/dashboard/analytics`, `/dashboard/inventory` — redirects `starter` + `pro` → `/dashboard/upgrade`
- `/onboarding` has-tenant guard changed from `startsWith('/onboarding')` → `pathname === '/onboarding'` so `/onboarding/subscribe` isn't blocked

### New File: `src/app/dashboard/upgrade/page.tsx`
- Shows Pro and Premium plan descriptions
- "Manage subscription →" form action → `createBillingPortalSession`
- "Back to dashboard" link

## Acceptance Criteria Results

| AC | Status | Notes |
|----|--------|-------|
| AC-1: Subscription checkout after onboarding | ✓ | onboarding.ts → /onboarding/subscribe → Stripe Checkout |
| AC-2: Successful subscription updates tenant | ✓ | mode=subscription webhook updates stripe IDs + plan_tier |
| AC-3: Subscription changes synced | ✓ | subscription.updated + subscription.deleted handlers |
| AC-4: Tier gates enforce feature access | ✓ | Middleware gates Pro+ and Premium routes |
| AC-5: Billing portal accessible | ✓ | /dashboard/upgrade + settings/pricing → Stripe Customer Portal |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Store stripe_customer_id on checkout initiation, not webhook | Avoids timing gap between checkout start and webhook arrival; idempotent |
| Discriminate checkout.session.completed by session.mode | Cleanest way to handle two different checkout flows in same webhook handler |
| Tier gate only on gated routes (not all /dashboard) | Avoids second DB call on every request; common routes don't pay the cost |
| planTierFromPriceId falls back to 'starter' | Safe default if price ID is unrecognized; downgrade is safer than an error |

## New Env Vars Required

| Variable | Purpose |
|----------|---------|
| `STRIPE_PRICE_STARTER_ID` | Stripe price ID for $99/mo Starter plan |
| `STRIPE_PRICE_PRO_ID` | Stripe price ID for $149/mo Pro plan |
| `STRIPE_PRICE_PREMIUM_ID` | Stripe price ID for $299/mo Premium plan |

## Files Created/Modified

| File | Change |
|------|--------|
| `src/lib/actions/billing.ts` | Created — subscription checkout + billing portal |
| `src/app/onboarding/subscribe/page.tsx` | Created — auto-initiate Stripe checkout |
| `src/lib/actions/onboarding.ts` | Updated — redirect to /onboarding/subscribe |
| `src/app/api/webhooks/stripe/route.ts` | Updated — subscription events + mode discrimination |
| `src/lib/supabase/middleware.ts` | Updated — tier gates + /onboarding guard fix |
| `src/app/dashboard/upgrade/page.tsx` | Created — upgrade prompt |

## Verification

- [x] `npm run build` — clean build, 25 pages
- [x] TypeScript — zero errors

## Deferred Issues

None.
