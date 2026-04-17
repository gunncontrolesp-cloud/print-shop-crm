---
phase: 12-accounting
plan: 01
status: complete
completed: 2026-04-17
---

# Summary: Accounting Settings + Webhook Infrastructure

## What Was Built

- Migration `20260417000005_accounting_settings.sql`: adds `accounting_webhook_url TEXT` and `accounting_webhook_enabled BOOLEAN DEFAULT false` to `tenants`
- `src/lib/accounting.ts` — `fireAccountingWebhook(tenantId, event, payload)`: reads tenant settings via service client; no-ops if disabled or URL absent; fire-and-forget, never throws
- `src/lib/actions/accounting.ts` — `saveAccountingSettings(formData)` (admin-only, saves URL + enabled toggle) and `testAccountingWebhook()` (sends `test.connection` event, returns `{ ok, message }`)
- `src/app/dashboard/settings/accounting/page.tsx` — admin-only settings page: webhook URL input, enable/disable checkbox, save button, events documentation
  - `src/app/dashboard/settings/accounting/TestConnectionButton.tsx` — client component; calls `testAccountingWebhook()` and shows inline pass/fail
- `src/components/nav-sidebar.tsx` — "Accounting" link added to Admin group (strictAdminOnly, BookOpen icon)

## Architecture note

`fireAccountingWebhook` is a pure utility — called by server actions (Plan 12-02 wires it to invoice events). No direct QB/Xero OAuth; n8n handles the accounting API calls.
