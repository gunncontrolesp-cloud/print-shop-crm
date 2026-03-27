# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-03-27)

**Core value:** Print shop staff can manage the full job lifecycle — from quote to production to delivery — without paper, spreadsheets, or missed notifications.
**Current focus:** v0.1 Foundation — Phase 3: Invoicing + Payments

## Current Position

Milestone: v0.1 Foundation (v0.1.0)
Phase: 3 of 6 (Invoicing + Payments) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-27 — Phase 2 complete, transitioned to Phase 3

Progress:
- Milestone: [███████░░░] 50%
- Phase 3: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready for next PLAN]
```

## Performance Metrics

**Velocity:**
- Total plans completed: 8
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

### Deferred Issues

None.

### Blockers/Concerns

- All migrations (000001–000004 + 20260327000002) not yet applied to Supabase — required before runtime testing
- AWS credentials + n8n webhook URLs needed in `.env.local` before S3 uploads and notifications work

## Session Continuity

Last session: 2026-03-27
Stopped at: Phase 2 complete — all 3 plans unified, transitioned to Phase 3
Next action: /paul:plan for Phase 3 (Invoicing + Payments)
Resume file: .paul/ROADMAP.md

---
*STATE.md — Updated after every significant action*
