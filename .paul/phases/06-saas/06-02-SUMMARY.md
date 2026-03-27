---
phase: 06-saas
plan: 02
type: summary
status: complete
completed: 2026-03-27
---

# Summary: 06-02 Onboarding Flow

## What Was Built

### New File: `src/lib/actions/onboarding.ts`
- `createTenant(formData)` server action — three sequential service role writes:
  1. INSERT into `public.tenants` (name, plan_tier)
  2. UPDATE `public.users` SET `tenant_id` = new tenant id for current user
  3. INSERT into `public.pricing_config` with `tenant_id` + full default config JSONB
- Uses `createServiceClient()` for all writes — user has no tenant yet so RLS blocks the anon/user client
- Validates: shop name present, plan_tier one of starter/pro/premium
- Redirects to `/dashboard` on success

### New File: `src/app/onboarding/layout.tsx`
- Minimal layout: centered card, gray background, no nav sidebar

### New File: `src/app/onboarding/page.tsx`
- Server component with `action={createTenant}` form
- Shop name text input (required)
- Plan tier radio group: Starter $99/mo, Pro $149/mo (default), Premium $299/mo — each with description
- Submit button: "Create shop and continue →"

### Updated: `src/lib/supabase/middleware.ts`
- No user + `/onboarding` → `/login`
- User with `tenant_id` + `/onboarding` → `/dashboard` (prevents re-onboarding loop)

## Acceptance Criteria Results

| AC | Status | Notes |
|----|--------|-------|
| AC-1: Onboarding accessible to untenanted staff | ✓ | 06-01 middleware redirects /dashboard → /onboarding; page renders form |
| AC-2: Tenant created and user linked | ✓ | createTenant: INSERT tenant → UPDATE user → INSERT pricing_config → redirect |
| AC-3: Dashboard unlocked after onboarding | ✓ | tenant_id set → middleware allows /dashboard through |
| AC-4: Onboarding guards | ✓ | No-user → /login; has-tenant → /dashboard |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Service role for all 3 writes | User has no tenant_id yet; get_my_tenant_id() returns NULL; RLS blocks anon client |
| Pro as defaultChecked tier | Mid-tier default captures most value; user can choose down/up explicitly |
| pricing_config seeded in onboarding action | Quote builder needs a pricing row to function; seed immediately so dashboard is usable on first login |

## Files Created/Modified

| File | Change |
|------|--------|
| `src/lib/actions/onboarding.ts` | Created — createTenant server action |
| `src/app/onboarding/layout.tsx` | Created — minimal layout |
| `src/app/onboarding/page.tsx` | Created — onboarding form |
| `src/lib/supabase/middleware.ts` | Updated — /onboarding guards |

## Verification

- [x] `npm run build` — clean build, 23 pages (+ /onboarding)
- [x] TypeScript — zero errors

## Deferred Issues

None.
