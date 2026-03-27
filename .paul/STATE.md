# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-27)

**Core value:** Print shop staff can manage the full job lifecycle — from quote to production to delivery — without paper, spreadsheets, or missed notifications.
**Current focus:** v0.1 Foundation — Phase 6: SaaS / Multi-Tenant

## Current Position

Milestone: v0.1 Foundation (v0.1.0)
Phase: 6 of 6 (SaaS / Multi-Tenant) — Not started
Plan: Phase 5 complete — ready for Phase 6
Status: Ready for next PLAN
Last activity: 2026-03-27 — Phase 5 complete (analytics + inventory)

Progress:
- Milestone: [█████████░] 97%
- Phase 5: [██████████] 100% ✓

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete — ready for next PLAN]
```

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: —

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Single-tenant first | Init | Simpler architecture throughout Phases 1-5 |
| PaymentProvider abstraction | Init | Stripe in Phase 3; PayPal/Clover pluggable later |
| Formula-based pricing | Init | Pricing table needed in Phase 1 Settings screen |
| n8n Cloud from day one | Init | No self-hosted infra in production |
| Next.js 16 proxy convention | 01-01 | middleware.ts → proxy.ts with export function proxy() |
| buttonVariants over asChild | 01-02 | @base-ui/react/button doesn't support asChild; use buttonVariants() on Link |
| Pricing config as single-row JSONB | 01-03 | Flexible config without schema migrations when adding product types |
| Quote line items as JSONB array | 01-03 | Fast quoting without join complexity; stores full audit record |
| Supabase join returns array type | 01-03 | Use Array.isArray() guard when casting joined relation to single object |
| Order status as check constraint | 01-04 | Simpler than enum type; easier to extend without new migrations |
| pending→approved enforced in app layer | 01-04 | RLS can't inspect status transitions; role check lives in server action |
| Presigned URL upload pattern | 02-02 | Server generates URL + s3Key, client PUTs to S3, server records metadata |
| OrderFilesPanel client boundary | 02-02 | useRouter contained in client component; order detail stays server component |
| n8n utility as plain module | 02-03 | notifyN8n imported by server actions — fire-and-forget, never throws |
| sendPaymentLink re-sendable on 'sent' | 03-02 | Creates new Stripe link if customer loses email; button shown for draft+sent |
| stripe_payment_intent_id = plink_xxx | 03-02 | Webhook handler uses this field to match Stripe events to invoices |
| createServiceClient for webhooks | 03-03 | Service role bypasses RLS — for trusted server contexts only |
| Stripe webhook duplicate = no-op | 03-03 | update to 'paid' when already 'paid' is idempotent; no idempotency key needed |
| Stripe v21 ui_mode='embedded_page' | 04-04 | SDK renamed 'embedded' → 'embedded_page'; TypeScript types enforce correct value |
| CSS bar charts, no library | 05-01 | Recharts deferred to Phase 6 polish; adequate for v0.1 analytics |
| JS aggregation for analytics | 05-01 | Avoids Supabase RPC; adequate at small-shop scale |
| Low-stock alert on adjust only | 05-02 | Alert fires when stock consumed, not on item creation |
| quantity CHECK >= 0 + Math.max | 05-02 | Schema + app layer both prevent negative inventory |

### Git State
Last commit: 47ae68f
Branch: main
Feature branches merged: none

### Deferred Issues

None.

### Blockers/Concerns

- All migrations (000001–000004 + 20260327000002–20260327000005) not yet applied to Supabase — required before runtime testing
- AWS credentials + n8n webhook URLs needed in `.env.local` before S3 uploads and notifications work
- STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY needed in `.env.local` before payment flow works at runtime
- Stripe webhook endpoint must be registered in Stripe dashboard pointing to /api/webhooks/stripe

## Session Continuity

Last session: 2026-03-27
Stopped at: Phase 5 complete — analytics + inventory unified
Next action: /paul:plan for Phase 6 (SaaS / Multi-Tenant — 06-01: multi-tenant data isolation + RLS)
Resume file: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
