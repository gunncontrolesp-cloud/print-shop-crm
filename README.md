# Print Shop CRM

> A purpose-built CRM for print shop businesses — managing customers, quotes, orders, production workflows, file uploads, and invoicing in one place.

**Type:** Application
**Stack:** Next.js + Supabase + n8n Cloud + Stripe + AWS S3 + Vercel
**Skill Loadout:** PAUL (required), ui-ux-pro-max (recommended), AEGIS (recommended post-build)
**Quality Gates:** API test coverage, security scan (pre-payments, pre-SaaS), WCAG AA (customer portal), LCP < 2.5s (dashboard)

***

## Overview

Print shops are production-heavy businesses that generic CRMs don't serve. The gap: tools like HubSpot track contacts and leads but can't manage the full lifecycle of a print job — quoting, production stages, file management, invoicing, and customer notifications in one place.

This CRM is built single-tenant first, designed to evolve into a SaaS product ($99/$149/\$299/mo) for other print shops in Phase 6.

***

## Stack

| Layer        | Choice                                   | Rationale                                                          |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------ |
| Frontend     | Next.js (App Router)                     | Full-stack React with API routes — no separate backend             |
| Backend      | Next.js API Routes                       | Unified stack; REST endpoints co-located with frontend             |
| Database     | Supabase (PostgreSQL)                    | Managed Postgres + auth + RLS + realtime in one service            |
| Auth         | Supabase Auth                            | JWT + magic link; admin and staff roles                            |
| File Storage | AWS S3 (presigned URLs)                  | Browser uploads directly to S3 — server never touches file bytes   |
| Automation   | n8n Cloud                                | Managed automations; no ops burden. Self-hosted for local dev only |
| Payments     | Stripe (via PaymentProvider abstraction) | Stripe first; PayPal/Clover pluggable without restructure          |
| Deployment   | Vercel                                   | Zero-config deploys; preview environments from PRs                 |
| UI           | Tailwind + shadcn/ui                     | Desktop-first; accessible components; no custom design system      |

***

## Data Model

| Entity   | Key Fields                                                                   | Relationships                           |
| -------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| User     | id, email, role (admin/staff), name                                          | Assigned to Orders                      |
| Customer | id, name, business\_name, email, phone, preferences (JSON)                   | Has many Quotes, Orders                 |
| Quote    | id, customer\_id, status, line\_items (JSON), total                          | Belongs to Customer → converts to Order |
| Order    | id, quote\_id, customer\_id, status, assigned\_to, due\_date                 | Has many Jobs, Files, Invoices          |
| Job      | id, order\_id, stage (design/proofing/printing/finishing/ready\_for\_pickup) | Belongs to Order                        |
| File     | id, order\_id, file\_url, file\_name, file\_type                             | Belongs to Order                        |
| Invoice  | id, order\_id, amount, paid\_status, stripe\_payment\_intent\_id             | Belongs to Order                        |

**Notes:** `Quote.line_items` as JSON. Soft deletes on Customer + Order. RLS enforces role access at DB layer.

***

## API Surface

**Auth:** Supabase JWT. Two roles: `admin` (full access) and `staff` (job/order updates, read-only invoices/quotes).

| Group                     | Methods                  | Auth                        | Purpose                 |
| ------------------------- | ------------------------ | --------------------------- | ----------------------- |
| /api/customers            | GET, POST, PATCH, DELETE | admin                       | Customer CRUD           |
| /api/quotes               | GET, POST, PATCH         | admin                       | Quote management        |
| /api/quotes/\[id]/convert | POST                     | admin                       | Quote → Order           |
| /api/orders               | GET, POST, PATCH         | required                    | Order tracking          |
| /api/orders/\[id]/jobs    | GET, PATCH               | required                    | Job stage updates       |
| /api/files/presign        | POST                     | required                    | S3 presigned upload URL |
| /api/invoices             | GET, POST, PATCH         | admin                       | Invoice management      |
| /api/invoices/\[id]/pay   | POST                     | required                    | Initiate payment        |
| /api/webhooks/stripe      | POST                     | public (signature verified) | Payment events          |
| /api/webhooks/n8n         | POST                     | internal (secret header)    | Notification triggers   |

***

## Architecture

**Pricing model:** Formula-based — `base_price × qty_break_multiplier × material_multiplier × finishing_multiplier`. Multipliers stored in an admin-editable pricing table. Auto-calculates totals as staff builds quote line items.

**Payment abstraction:** `PaymentProvider` interface with Stripe as the first implementation. PayPal and Clover can be added without restructuring invoice or webhook logic.

**Realtime:** Supabase Realtime subscriptions on the `jobs` table power the production board — no separate WebSocket infrastructure needed.

**File uploads:** Presigned S3 URLs (5-min expiry, content-type allowlist: PDF, PNG, JPG, AI, EPS). Server generates URL; client uploads directly.

***

## UI/UX

Desktop-first. Mobile-responsive for owner status checks. Production board is desktop-only (drag-and-drop).

| View                     | Complexity | Notes                                       |
| ------------------------ | ---------- | ------------------------------------------- |
| Dashboard                | Medium     | Open orders, unpaid invoices, jobs by stage |
| Quote Builder            | High       | Dynamic line items, formula pricing         |
| Order Detail             | High       | Central hub — status, jobs, files, invoice  |
| Production Board         | High       | Trello-style, Supabase Realtime             |
| Customer Detail          | Medium     | History, preferences                        |
| Invoice View             | Medium     | Generate, send, track payment               |
| File Manager             | Medium     | Upload + view per order                     |
| Settings / Pricing Table | Low        | Admin-editable multipliers                  |

***

## Deployment

| Environment  | Platform       | Notes                                        |
| ------------ | -------------- | -------------------------------------------- |
| Production   | Vercel         | Auto-deploy from `main`                      |
| Preview      | Vercel         | Auto-deploy from PRs                         |
| Database     | Supabase cloud | Migrations via Supabase CLI                  |
| Automation   | n8n Cloud      | Production; self-hosted Docker for local dev |
| File Storage | AWS S3         | Single bucket, path-prefixed by order ID     |

Secrets in Vercel dashboard. Migrations in `supabase/migrations/`.

***

## Integrations

| Integration      | Purpose                               |
| ---------------- | ------------------------------------- |
| Supabase         | DB, auth, realtime, RLS               |
| AWS S3           | File storage (presigned uploads)      |
| Stripe           | Payments + webhooks                   |
| n8n Cloud        | Email + SMS automations               |
| Twilio (via n8n) | SMS — job completed, ready for pickup |

**Automation flows:** Quote created → email customer · Order approved → notify staff · Job ready for pickup → email + SMS customer · Payment received → mark paid + notify owner

***

## Implementation Phases

| Phase | Scope                                                                | Outcome                       |
| ----- | -------------------------------------------------------------------- | ----------------------------- |
| 1     | Customer DB, Quote Builder (formula pricing), Order tracking, Auth   | Replace the spreadsheet       |
| 2     | Production board (Realtime), File uploads, Email + SMS notifications | Live board + automated comms  |
| 3     | Invoicing, Stripe payments (PaymentProvider abstraction)             | Full order-to-cash automation |
| 4     | Customer portal, proof approval, embedded checkout                   | Customers self-serve          |
| 5     | Analytics dashboard, inventory tracking                              | Business intelligence         |
| 6     | Multi-tenant, SaaS billing ($99/$149/\$299/mo tiers)                 | Sellable product              |

***

## Design Decisions

1. **Single-tenant first** — simpler architecture, faster to ship, validates the product before SaaS complexity
2. **Next.js API routes over separate backend** — unified stack, lower deployment complexity
3. **Supabase over raw Postgres** — auth + RLS + realtime bundled; eliminates three infrastructure concerns
4. **Presigned S3 uploads** — server never handles file bytes; reduces load and simplifies file handling
5. **n8n Cloud from day one** — no ops burden in production; self-hosted only for local dev
6. **Job entity separate from Order** — Order = business status; Job = production stage. Clean separation
7. **Tailwind + shadcn/ui** — desktop-first, accessible by default, no custom design system needed
8. **Formula-based pricing** — `base × qty multiplier × material multiplier × finishing multiplier`; admin-configurable; eliminates manual pricing errors
9. **PaymentProvider abstraction** — Stripe first, PayPal/Clover pluggable; future-proofs payment layer without lock-in

***

## Open Questions

All resolved during ideation. None outstanding.

***

## References

* [Supabase RLS docs](https://supabase.com/docs/guides/database/row-level-security)
* [Supabase local dev CLI](https://supabase.com/docs/guides/local-development)
* [shadcn/ui components](https://ui.shadcn.com)
* [n8n Cloud](https://n8n.io)
* [Stripe webhook verification](https://stripe.com/docs/webhooks/signatures)

***

*Graduated: 2026-03-26*
