# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-27)

**Core value:** Print shop staff can manage the full job lifecycle — from quote to production to delivery — without paper, spreadsheets, or missed notifications.
**Current focus:** v0.1 Foundation — COMPLETE ✓

## Current Position

Milestone: v0.2 Timecards
Phase: 2.1 (Employee Timecards) — In Progress
Plan: 02.1-02 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-04-02 — Created .paul/phases/02.1-timecards/02.1-02-PLAN.md

Progress:
- Phase 2.1: [███░░░░░░░] 33% (1/3 plans complete)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan created, awaiting approval]
```

## Performance Metrics

**Velocity:**
- Total plans completed: 17
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
| Seed tenant via hardcoded UUID | 06-01 | DO block UPDATEs before columns exist; hardcoded UUID + sequential UPDATEs is safe |
| users.tenant_id nullable | 06-01 | Users mid-onboarding have no tenant yet; NOT NULL would block signup flow |
| Customer portal policies via auth_user_id | 06-01 | Customers not in public.users; is_authenticated() correctly returns false for them |
| Service role in middleware tenant check | 06-01 | Edge middleware can't use cookies-based server client; service role bypasses RLS chicken-and-egg |
| Service role for all onboarding writes | 06-02 | get_my_tenant_id() returns NULL before tenant assigned; anon client blocked by RLS on all three writes |
| Pro as default tier in onboarding | 06-02 | Mid-tier default captures most value; users can choose explicitly |
| Store stripe_customer_id on checkout initiation | 06-03 | Avoids timing gap between checkout start and webhook; idempotent |
| Tier gate only on gated routes | 06-03 | Avoids second DB call on every /dashboard request; common routes don't pay the cost |

### Git State
Last commit: 4ece439
Branch: main
Feature branches merged: none

### Deferred Issues

None.

### Blockers/Concerns (deployment prerequisites)

- All migrations (000001–000004 + 20260327000002–000007) must be applied to Supabase before runtime
- AWS credentials + n8n webhook URLs needed in `.env.local`
- STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY needed in `.env.local`
- STRIPE_PRICE_STARTER_ID + STRIPE_PRICE_PRO_ID + STRIPE_PRICE_PREMIUM_ID needed in `.env.local` (create prices in Stripe dashboard first)
- SUPABASE_SERVICE_ROLE_KEY needed in `.env.local`
- Stripe webhook endpoint must be registered in Stripe dashboard pointing to /api/webhooks/stripe
- Stripe Billing Portal must be configured in Stripe dashboard (Settings → Billing → Customer portal)

## Session Continuity

Last session: 2026-04-02
Stopped at: Plan 02.1-01 loop closed (PLAN ✓ → APPLY ✓ → UNIFY ✓)
Next action: /paul:plan 02.1-02 — Admin timecard dashboard + editing + approval workflow
Resume file: .paul/phases/02.1-timecards/

---
*STATE.md — Updated after every significant action*
