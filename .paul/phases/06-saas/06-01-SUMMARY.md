---
phase: 06-saas
plan: 01
type: summary
status: complete
completed: 2026-03-27
---

# Summary: 06-01 Multi-Tenant Data Isolation + RLS

## What Was Built

### Migration: `supabase/migrations/20260327000007_multi_tenant.sql`
- `public.tenants` table — `id`, `name`, `plan_tier` (starter/pro/premium), `stripe_customer_id`, `stripe_subscription_id`
- Seed tenant inserted with hardcoded UUID `00000000-0000-0000-0000-000000000001` (`Default Tenant`, `premium`)
- `tenant_id` column added to 9 tables: `users` (nullable), `customers`, `pricing_config`, `quotes`, `orders`, `jobs`, `files`, `invoices`, `inventory_items` (all NOT NULL after backfill)
- All existing rows backfilled with seed tenant UUID
- `get_my_tenant_id()` SECURITY DEFINER function — queries `public.users WHERE id = auth.uid()`
- `is_admin()` rebuilt — requires `tenant_id IS NOT NULL`
- `is_authenticated()` rebuilt — requires `tenant_id IS NOT NULL`
- All RLS policies on all 8 data tables dropped and rebuilt with `tenant_id = public.get_my_tenant_id()` filter
- `public.tenants` RLS enabled with SELECT + UPDATE policies
- Portal customer policies (jobs, files, invoices, orders) preserved using `auth_user_id` join path — customers not in `public.users` so `is_authenticated()` correctly returns false for them
- `handle_new_user` trigger updated — reads `tenant_id` from `raw_user_meta_data`; portal customers (`is_customer = true`) still skipped

### New File: `src/lib/tenant.ts`
- `getTenantId()` — fetches `tenant_id` from `public.users` for current authenticated user; throws if no tenant assigned

### Updated Server Actions (6 files)
- `src/lib/actions/customers.ts` — `createCustomer` includes `tenant_id`
- `src/lib/actions/quotes.ts` — `createQuote` includes `tenant_id`
- `src/lib/actions/orders.ts` — `convertQuoteToOrder` (orders insert) and `updateOrderStatus` (jobs insert) both include `tenant_id`
- `src/lib/actions/invoices.ts` — `createInvoice` includes `tenant_id`
- `src/lib/actions/files.ts` — `recordUploadedFile` includes `tenant_id`
- `src/lib/actions/inventory.ts` — `createInventoryItem` includes `tenant_id`

### Updated Middleware: `src/lib/supabase/middleware.ts`
- Staff users on `/dashboard` with no `tenant_id` in `public.users` are redirected to `/onboarding`
- Uses service role client (no cookies needed) to bypass RLS chicken-and-egg on tenant check
- Portal auth checks unaffected

## Acceptance Criteria Results

| AC | Status | Notes |
|----|--------|-------|
| AC-1: Tenant table exists | ✓ | `public.tenants` with all columns; all data tables have `tenant_id NOT NULL` (users nullable) |
| AC-2: RLS enforces tenant isolation | ✓ | All policies rebuilt with `tenant_id = get_my_tenant_id()` |
| AC-3: INSERT operations include tenant_id | ✓ | All 6 INSERT server actions updated |
| AC-4: Staff without tenant redirected | ✓ | Middleware redirects `/dashboard` to `/onboarding` if no tenant |
| AC-5: handle_new_user assigns tenant | ✓ | Trigger reads `tenant_id` from metadata; customer skip preserved |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Seed tenant via hardcoded UUID, not DO $$ block | DO block UPDATEs before columns exist; hardcoded UUID + sequential UPDATEs is simpler and safe |
| `public.users.tenant_id` stays nullable | Users mid-onboarding (between signup and tenant assignment) have no tenant yet |
| Customer portal policies via `auth_user_id` join | Customers not in `public.users`; `is_authenticated()` returns false for them — correct behavior |
| Service role client in middleware for tenant check | Middleware runs on Edge; service role bypasses RLS chicken-and-egg during onboarding transition |
| Added customer order access policy to orders table | Orders table was missing a customer SELECT policy — needed for portal order tracking |

## Files Created/Modified

| File | Change |
|------|--------|
| `supabase/migrations/20260327000007_multi_tenant.sql` | Created — full multi-tenant migration |
| `src/lib/tenant.ts` | Created — getTenantId() helper |
| `src/lib/actions/customers.ts` | Updated — tenant_id in createCustomer |
| `src/lib/actions/quotes.ts` | Updated — tenant_id in createQuote |
| `src/lib/actions/orders.ts` | Updated — tenant_id in convertQuoteToOrder + updateOrderStatus (jobs) |
| `src/lib/actions/invoices.ts` | Updated — tenant_id in createInvoice |
| `src/lib/actions/files.ts` | Updated — tenant_id in recordUploadedFile |
| `src/lib/actions/inventory.ts` | Updated — tenant_id in createInventoryItem |
| `src/lib/supabase/middleware.ts` | Updated — tenant check + /onboarding redirect |

## Verification

- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run build` — clean build, 22 pages

## Deferred Issues

None.
