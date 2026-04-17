---
phase: 07-manager-role
plan: 01
status: complete
completed: 2026-04-17
---

# Summary: Manager Role — DB Migration + Route Guards + Nav

## What Was Built

- `manager` added to `public.user_role` enum via migration `20260416000001_manager_role.sql`
- `requireElevated()` exported from `src/lib/actions/employees.ts` — checks for admin or manager
- Role validation in `updateEmployee` updated to accept `['admin', 'staff', 'manager']`
- Manager option added to employee edit dropdown (`settings/employees/[id]/edit/page.tsx`)
- Route guards updated to elevated in: timeclock admin page, timeclock admin edit, timeclock reports, timeclock export API, kiosk staff pages (3)
- Action-level guards updated to elevated in: `timeclock.ts`, `catalog.ts`, `staff-profiles.ts`, `invoices.ts`
- Order approval guard updated to elevated in `orders.ts`
- `nav-sidebar.tsx`: added `strictAdminOnly` flag; Employees + Settings stay admin-only; all other admin items visible to managers

## Access Matrix

| Feature | Admin | Manager | Staff |
|---------|-------|---------|-------|
| Timecards / Time Reports | ✓ | ✓ | — |
| Product Catalog | ✓ | ✓ | — |
| Kiosk Staff | ✓ | ✓ | — |
| Order Approval | ✓ | ✓ | — |
| Invoices | ✓ | ✓ | — |
| Analytics | ✓ | ✓ | — |
| Employees | ✓ | — | — |
| Settings / Pricing | ✓ | — | — |

## Verification

- `npx tsc --noEmit` passes clean
