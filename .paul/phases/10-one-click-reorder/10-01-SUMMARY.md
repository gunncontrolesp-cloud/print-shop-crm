---
phase: 10-one-click-reorder
plan: 01
status: complete
completed: 2026-04-17
---

# Summary: One-Click Reorder — Portal Button + Admin Badge

## What Was Built

- Migration `20260417000004_reorder.sql`: adds `is_reorder BOOLEAN DEFAULT false` and `original_order_id UUID` to quotes
- `notifyReorder()` in `n8n.ts`: fires `N8N_WEBHOOK_REORDER` with quoteId, customerName, customerEmail, originalOrderId
- `reorderJob(orderId)` in `orders.ts`: portal-safe action (no getTenantId — uses customer.tenant_id); verifies order belongs to this customer; creates pre-filled quote with original line_items; fires n8n; redirects to `/portal?reordered=1`
- Portal home page: "Reorder" button on completed/delivered orders; green confirmation banner on `?reordered=1`
- Admin quote list: amber "Reorder" badge next to customer name for `is_reorder = true` quotes

## Env var needed

Add to `.env.local`: `N8N_WEBHOOK_REORDER=<your-n8n-webhook-url>`

## Note on file linking (AC-4)

Files are tied to orders, not quotes. Since the reorder creates a quote (not yet an order), pre-associating asset files is not possible at reorder time. Admin can reference customer's Assets tab when processing the reorder. File linking can be added in a future plan after order creation.
