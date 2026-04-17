---
phase: 08-quote-reminders
plan: 01
status: complete
completed: 2026-04-17
---

# Summary: Quote Expiry — Migration + UI + Portal Enforcement

## What Was Built

- Migration `20260417000001_quote_expiry.sql`: adds `expires_at TIMESTAMPTZ` to quotes; backfills existing pending/sent quotes to 30 days from creation
- `createQuote` action: new quotes get `expires_at` = now + 30 days automatically
- `updateQuoteExpiry(id, expiresAt)` + `updateQuoteExpiryAction(formData)` in `quotes.ts`: elevated guard (admin or manager)
- Quote list page: added Expiry column with color-coded badges (red Expired / amber Expires soon / gray date)
- Quote detail page: expiry badge in header; Extend Expiry date form shown to admin/manager on active quotes

## Portal Note

No portal quote approval page exists — customers see orders, not quotes. Portal expiry enforcement (AC-4) is deferred until a portal quote view is built. All other ACs satisfied.

## Access

Extend expiry: admin and manager. Creating quotes and seeing expiry badges: all authenticated users.
