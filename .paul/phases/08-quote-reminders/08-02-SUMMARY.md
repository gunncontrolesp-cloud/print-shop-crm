---
phase: 08-quote-reminders
plan: 02
status: complete
completed: 2026-04-17
---

# Summary: Quote Reminders — Send Reminder Action + n8n Hook

## What Was Built

- Migration `20260417000002_quote_reminder_tracking.sql`: adds `reminder_sent_at TIMESTAMPTZ` to quotes
- `notifyQuoteReminder()` in `n8n.ts`: fires `N8N_WEBHOOK_QUOTE_REMINDER` with quoteId, customerEmail, customerName, subtotal
- `sendQuoteReminder(id)` in `quotes.ts`: elevated guard, status check, 48h cooldown enforced, fires n8n hook, updates `reminder_sent_at`
- Quote detail page: "Send Reminder" button (outline) for elevated users on pending/sent quotes; shows "Sent Xh ago" when cooling down; invisible on approved/rejected

## Env var needed

Add to `.env.local`: `N8N_WEBHOOK_QUOTE_REMINDER=<your-n8n-webhook-url>`

## Cooldown behavior

- No previous reminder → button enabled
- Reminder < 48h ago → shows "Sent Xh ago" (disabled state)
- Reminder ≥ 48h ago → button re-enabled as "Send Reminder"
