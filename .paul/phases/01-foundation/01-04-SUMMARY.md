---
phase: 01-foundation
plan: 04
type: summary
completed: 2026-03-26
---

# Plan 01-04 Summary: Order Management + Status Tracking

## What Was Built

Orders module — the production unit that closes the quote-to-delivery loop.

### Files Created / Modified

| File | Action | Notes |
|------|--------|-------|
| `supabase/migrations/20260326000004_orders.sql` | Created | orders table, 6-status check constraint, RLS policies, updated_at trigger |
| `src/lib/types.ts` | Created | Shared types extracted from 'use server' files: PricingConfig, LineItem, OrderStatus, ORDER_STATUS_SEQUENCE, getNextStatus |
| `src/lib/actions/orders.ts` | Created | convertQuoteToOrder, updateOrderStatus (with role enforcement), deleteOrder |
| `src/components/nav-sidebar.tsx` | Modified | Orders item enabled; removed disabled branch entirely (TypeScript cleanup) |
| `src/app/dashboard/quotes/[id]/page.tsx` | Modified | "Convert to Order" button added (approved quotes only) |
| `src/app/dashboard/orders/page.tsx` | Created | Orders list with 6 color-coded status badges |
| `src/app/dashboard/orders/[id]/page.tsx` | Created | Order detail: 6-stage progress indicator, line items table, role-gated action buttons |

### Features Delivered

- **Orders table**: `quote_id` (nullable), `customer_id`, `status` (check constraint), `line_items` (jsonb), `total`, `notes`, `created_by`, `created_at`, `updated_at` with RLS
- **Quote → Order conversion**: One-click on approved quote detail; prevents duplicate orders by checking existing `quote_id` reference
- **6-stage status workflow**: pending → approved → printing → finishing → completed → delivered
- **Role enforcement**: `pending → approved` is admin-only, enforced in server action (not RLS — RLS can't inspect transitions)
- **Status progress indicator**: Visual pill-chain showing past (✓), current (filled), and future (gray) stages
- **Action buttons**: Context-sensitive — only valid next transition shown; admin-only approval gated on `isAdmin`
- **Delete**: Admin-only, available on any non-delivered order

## Build Stability

All 12 routes compile clean (zero errors). Turbopack production build passes.

## Decisions

| Decision | Rationale |
|----------|-----------|
| `src/lib/types.ts` extracted | `'use server'` files cannot re-export types or export sync functions; shared types need a plain (non-server) module |
| `getNextStatus` in lib/types | Used by both server actions (transition validation) and Server Components (render logic); can't live in 'use server' file |
| Duplicate order prevention | `convertQuoteToOrder` checks for existing `quote_id` match and redirects rather than creating duplicate |

## Lessons

- **Next.js 16 'use server' constraint is stricter than 15**: All exports must be async functions. Synchronous helpers and type re-exports must live outside the 'use server' boundary.
- **Pattern established**: `src/lib/types.ts` is now the canonical home for types shared across server actions and client components.

## Acceptance Criteria

- [x] AC-1: orders table with 6-status check constraint and RLS
- [x] AC-2: Quote → Order conversion on approved quotes only (with duplicate prevention)
- [x] AC-3: Status workflow with role-gated transitions and progress indicator
- [x] AC-4: Orders list and detail pages render correctly

## Next

Plan 01-05: Dashboard summary + Phase 1 integration testing (final plan of Phase 1)
