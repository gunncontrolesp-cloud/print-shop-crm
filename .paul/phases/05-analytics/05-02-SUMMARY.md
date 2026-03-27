---
phase: 05-analytics
plan: 02
subsystem: ui
tags: [inventory, low-stock, n8n, dashboard, server-actions]

requires:
  - phase: 01-foundation
    provides: is_admin() RLS helper + set_updated_at() trigger function
  - phase: 02-production
    provides: n8n fire-and-forget notification pattern

provides:
  - inventory_items table (migration 20260327000006)
  - createInventoryItem, updateInventoryItem, adjustQuantity server actions
  - notifyLowStock n8n helper
  - /dashboard/inventory page with low-stock highlighting + add form
  - Dashboard "Low Stock Items" StatCard
  - Inventory nav link in sidebar

affects: [06-saas]

tech-stack:
  added: []
  patterns:
    - "adjustQuantity fetches current qty before update — can't do atomic increment in Supabase client without RPC; JS fetch+compute+write is correct pattern for small-shop scale"
    - "Low-stock check inline after update — no DB trigger needed; fires n8n only when threshold crossed, not on every update"
    - "bind(null, id) on adjustQuantity — same FormData server action pattern as proof approval; id passed via bind, delta via FormData"

key-files:
  created:
    - supabase/migrations/20260327000006_inventory.sql
    - src/lib/actions/inventory.ts
    - src/app/dashboard/inventory/page.tsx
  modified:
    - src/lib/n8n.ts
    - src/app/dashboard/page.tsx
    - src/components/nav-sidebar.tsx
    - .env.local.example

key-decisions:
  - "JS fetch+compute for quantity adjustment — avoids Supabase RPC for simple arithmetic; adequate at small-shop scale"
  - "Low-stock alert on adjust only, not on create — initial stock is intentional; alert fires when stock is consumed"
  - "quantity CHECK >= 0 in schema — prevents negative stock; Math.max(0, ...) in action mirrors this at app layer"

duration: ~15min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 5 Plan 02: Inventory Tracking + Alerts Summary

**Admin can track consumable inventory (paper, ink, etc.), adjust quantities inline, and receive n8n alerts when stock falls to or below threshold — with a live Low Stock count on the dashboard.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Tasks | 2 completed |
| Files created | 3 |
| Files modified | 4 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Inventory List | Pass | Table with quantity/threshold; orange highlight + "Low stock" badge when at/below threshold |
| AC-2: Add Inventory Item | Pass | createInventoryItem server action + inline form; revalidates dashboard |
| AC-3: Adjust Stock Quantity | Pass | adjustQuantity bind pattern; notifyLowStock fires when newQty <= threshold |
| AC-4: Dashboard Low Stock Alert | Pass | lowStockCount computed from inventory_items query; orange StatCard → /dashboard/inventory |
| AC-5: Zero-state Handling | Pass | Empty state card with prompt shown when no items; lowStockCount = 0 |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260327000006_inventory.sql` | Created | inventory_items table + RLS + updated_at trigger |
| `src/lib/actions/inventory.ts` | Created | create/update/adjustQuantity server actions |
| `src/app/dashboard/inventory/page.tsx` | Created | Inventory management page |
| `src/lib/n8n.ts` | Modified | notifyLowStock appended |
| `src/app/dashboard/page.tsx` | Modified | inventory_items query + lowStockCount + Low Stock StatCard |
| `src/components/nav-sidebar.tsx` | Modified | Inventory link between Production and Invoices |
| `.env.local.example` | Modified | N8N_WEBHOOK_LOW_STOCK added |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Low-stock alert on adjust only | Initial stock is intentional; alert when stock is consumed, not created | No false alerts on item creation |
| JS fetch+compute for qty update | No Supabase RPC needed; adequate at small-shop scale | Simpler code, no DB functions to maintain |
| quantity CHECK >= 0 + Math.max | Schema constraint + app layer both prevent negative stock | Two-layer protection |

## Deviations from Plan

None — plan executed exactly as written.

## Phase 5 Complete

Both plans delivered:
- **05-01**: Revenue analytics dashboard (monthly revenue + order volume charts + top customers)
- **05-02**: Inventory tracking + low-stock alerts ✓

**Ready for Phase 6: SaaS / Multi-Tenant**

---
*Phase: 05-analytics, Plan: 02*
*Completed: 2026-03-27*
