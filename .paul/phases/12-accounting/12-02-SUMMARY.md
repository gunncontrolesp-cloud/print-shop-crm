---
phase: 12-accounting
plan: 02
status: complete
completed: 2026-04-17
---

# Summary: Invoice + Payment Sync with Status Tracking

## What Was Built

- Migration `20260417000006_accounting_sync.sql`: adds `accounting_sync_status TEXT CHECK ('pending','synced','failed') DEFAULT 'pending'` and `accounting_synced_at TIMESTAMPTZ` to `invoices`
- `src/lib/accounting.ts` updated: `fireAccountingWebhook()` now returns `AccountingSyncStatus` ('synced'|'pending'|'failed') instead of void — 'pending' when accounting is disabled/unconfigured
- `src/lib/actions/invoices.ts`:
  - `createInvoice()` fires `invoice.created` webhook and updates `accounting_sync_status` on the new invoice
  - `resyncInvoice(invoiceId)` — admin-only; fires appropriate event (`invoice.paid` or `invoice.created`) based on current status; updates sync status; returns `{ ok, message }` for inline feedback
- `src/app/api/webhooks/stripe/route.ts` — after marking invoice paid, fetches `tenant_id` + `amount`, fires `invoice.paid` accounting webhook, updates sync status
- Invoice list page: new "Sync" column showing Synced/Failed/— badges
- Invoice detail page: "Accounting Sync" row in details card showing status + date; ResyncButton for admins
  - `src/app/dashboard/invoices/[id]/ResyncButton.tsx` — client component, shows inline result

## How sync status flows

| Action | Event fired | Result |
|--------|-------------|--------|
| Invoice created | `invoice.created` | synced / pending / failed |
| Stripe payment confirmed | `invoice.paid` | synced / pending / failed |
| Admin manual resync | `invoice.paid` or `invoice.created` | synced / pending / failed |

'pending' means accounting is not enabled — no webhook fired, no error.
