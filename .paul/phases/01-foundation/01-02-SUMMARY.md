---
phase: 01-foundation
plan: 02
status: complete
completed: 2026-03-26
---

# Summary: 01-02 — Customer Module

## What Was Built

### Task 1: Customers Migration + RLS ✓
- `supabase/migrations/20260326000002_customers.sql`
- customers table: id, name, business_name, email, phone, address, preferences (jsonb), notes, created_at, updated_at
- RLS enabled: admin full CRUD policy, staff select/insert/update (no delete)
- `set_updated_at()` trigger function + customers_updated_at trigger

### Task 2: Dashboard Layout + Customer List ✓
- `src/components/nav-sidebar.tsx` — client component using usePathname for active state; Quotes/Orders show "Soon" badge
- `src/app/dashboard/layout.tsx` — server component; sidebar with nav, user email/role in footer, sign-out action; auth guard (redirect to /login if no session)
- `src/app/dashboard/customers/page.tsx` — server component; customer list table (name, business, email, phone), "New Customer" link, empty state
- `src/app/dashboard/page.tsx` — simplified (layout handles auth/nav now)

### Task 3: Customer CRUD ✓
- `src/lib/actions/customers.ts` — server actions: createCustomer, updateCustomer, deleteCustomer
- `src/components/customer-form.tsx` — reusable form component (new + edit share same UI)
- `src/app/dashboard/customers/new/page.tsx` — create form
- `src/app/dashboard/customers/[id]/page.tsx` — detail view with all fields, preferences JSON block, admin-only delete
- `src/app/dashboard/customers/[id]/edit/page.tsx` — edit form pre-filled

## Key Decisions Made During Apply

- **buttonVariants instead of asChild:** This shadcn version uses @base-ui/react/button which doesn't support asChild. Used `buttonVariants()` class on Link elements instead.
- **Shared CustomerForm component:** New and edit pages share one form component to avoid duplication. Not in plan spec but obvious DRY improvement within scope.
- **Simplified Promise.all pattern:** TypeScript inference issues with chained `.then()` on Supabase queries — split into sequential awaits for clarity.

## Verification

- [x] `npm run build` — zero errors, zero warnings
- [x] `npx tsc --noEmit` — zero TypeScript errors
- [x] All 7 routes compile: /, /login, /dashboard, /dashboard/customers, /dashboard/customers/new, /dashboard/customers/[id], /dashboard/customers/[id]/edit
- [ ] End-to-end CRUD — requires Supabase connection + migration applied (manual step)

## Files Created

- `supabase/migrations/20260326000002_customers.sql`
- `src/components/nav-sidebar.tsx`
- `src/components/customer-form.tsx`
- `src/components/ui/table.tsx` (shadcn)
- `src/components/ui/label.tsx` (shadcn)
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/customers/page.tsx`
- `src/app/dashboard/customers/new/page.tsx`
- `src/app/dashboard/customers/[id]/page.tsx`
- `src/app/dashboard/customers/[id]/edit/page.tsx`
- `src/lib/actions/customers.ts`

## Next Plan

01-03: Pricing table + Quote Builder
