# Print Shop CRM

## What This Is

A purpose-built CRM for print shop businesses — managing customers, quotes, orders, production workflows, file uploads, and invoicing in one place. Built single-tenant first, designed to evolve into a SaaS product sold nationally to other print shops at $99/$149/$299/mo subscription tiers.

## Core Value

Print shop staff can manage the full job lifecycle — from quote to production to delivery — without paper, spreadsheets, or missed notifications.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.0.0 |
| Status | Initializing |
| Last Updated | 2026-03-26 |

## Requirements

### Core Features

- **Quote Builder** — formula-based pricing (base × qty multiplier × material multiplier × finishing multiplier), admin-configurable pricing table, auto-calculated totals
- **Order Management** — quote → order conversion, status tracking (pending → approved → printing → finishing → completed → delivered)
- **Production Board** — Trello-style board with Supabase Realtime, job stage management (design/proofing/printing/finishing/ready_for_pickup)
- **File Management** — S3 presigned uploads per order (PDF, PNG, JPG, AI, EPS), 5-min expiry, content-type allowlist
- **Invoicing & Payments** — invoice generation from order, PaymentProvider abstraction (Stripe first, PayPal/Clover pluggable), payment link via email
- **Notifications** — email + SMS via n8n Cloud + Twilio for all key lifecycle events

### Validated (Shipped)

- ✓ Customer CRUD + detail views — Phase 1
- ✓ Formula-based Quote Builder with admin-configurable pricing table — Phase 1
- ✓ Quote → Order conversion + status tracking (6-stage lifecycle) — Phase 1
- ✓ Supabase Auth with admin/staff roles + JWT middleware — Phase 1
- ✓ Basic dashboard (open orders, status counts) — Phase 1
- ✓ Production Board (Trello-style Kanban, Supabase Realtime) — Phase 2
- ✓ Job stage management (design/proofing/printing/finishing/ready_for_pickup) — Phase 2
- ✓ File uploads via S3 presigned URLs (content-type allowlist, 100 MB limit) — Phase 2
- ✓ n8n Cloud notification hooks — quote sent, order approved, job ready for pickup — Phase 2
- ✓ Inbound /api/webhooks/n8n route (shared secret validation) — Phase 2

### Active (In Progress)

None.

### Planned (Next)
- [ ] Phase 3 — Invoicing + Payments (PaymentProvider abstraction)  ← NEXT
- [ ] Phase 4 — Customer portal + proof approval
- [ ] Phase 5 — Analytics dashboard + inventory
- [ ] Phase 6 — Multi-tenant SaaS conversion

### Out of Scope

- Multi-tenant architecture — Phase 6 only, after single-tenant is proven
- Mobile-first UI — desktop-first; mobile-responsive for owner status checks only
- Custom payment gateway — PaymentProvider abstraction handles swapping

## Target Users

**Primary:** Print shop staff (admin + production)
- Non-technical; needs intuitive UI they can use without training
- Daily users managing quotes, orders, and production stages
- Admin: full access; Staff: job/order updates, read-only invoices/quotes

**Secondary (Phase 4+):** Print shop customers
- Need self-service order tracking and proof approval
- Access via customer portal with scoped auth

## Context

**Business Context:**
Single print shop to start. Path to national SaaS product. Target: $10k+ MRR within 12 months of launch, 20 paying customers within 6 months of SaaS launch. Pricing: Starter $99/mo, Pro $149/mo, Premium $299/mo.

**Technical Context:**
Greenfield build. No existing systems to integrate with. Supabase handles auth + DB + realtime. n8n Cloud handles all automation. Stripe (via abstraction) handles payments. S3 handles file storage.

## Constraints

### Technical Constraints
- Supabase RLS must enforce role-based access at DB layer (admin vs. staff)
- File uploads via S3 presigned URLs only — server never handles file bytes
- Payment data: Stripe handles all card data — app stores only payment_intent_id and status
- Webhook security: Stripe signature verification; n8n webhooks protected by shared secret header
- Input validation: Zod on all API routes before DB operations

### Business Constraints
- Single-tenant first — no multi-tenant architecture until Phase 6
- No CI/CD pipeline in Phase 1 — manual Vercel deploys from git push
- Secrets in Vercel dashboard only — never committed to repo
- n8n Cloud for production; self-hosted Docker for local dev only

### Compliance Constraints
- No card numbers stored — Stripe handles PCI compliance
- Customer PII (contact info) stored in Supabase with RLS protection

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Single-tenant first | Simpler architecture, faster to ship, validates product before SaaS complexity | 2026-03-26 | Active |
| Next.js API routes over separate backend | Unified stack, lower deployment complexity | 2026-03-26 | Active |
| Supabase over raw Postgres | Auth + RLS + realtime bundled; eliminates three infrastructure concerns | 2026-03-26 | Active |
| Presigned S3 uploads | Server never handles file bytes; reduces load, standard pattern for large files | 2026-03-26 | Active |
| n8n Cloud from day one | No ops burden in production; self-hosted only for local dev | 2026-03-26 | Active |
| Job entity separate from Order | Order = business status; Job = production stage. Clean separation of concerns | 2026-03-26 | Active |
| Tailwind + shadcn/ui | Desktop-first, accessible by default, no custom design system needed | 2026-03-26 | Active |
| Formula-based pricing | base × qty × material × finishing multipliers; admin-configurable; eliminates manual errors | 2026-03-26 | Active |
| PaymentProvider abstraction | Stripe first; PayPal/Clover pluggable without restructure | 2026-03-26 | Active |
| buttonVariants over asChild | @base-ui/react/button doesn't support asChild; use buttonVariants() on Link | 2026-03-26 | Active |
| Pricing config as single-row JSONB | Flexible config without schema migrations when adding product types | 2026-03-26 | Active |
| Order status as check constraint | Simpler than enum type; easier to extend without new migrations | 2026-03-26 | Active |
| Presigned URL upload pattern | Server generates URL + s3Key, client PUTs directly to S3, server records metadata | 2026-03-27 | Active |
| OrderFilesPanel client boundary | useRouter contained in client component; order detail page stays server component | 2026-03-27 | Active |
| n8n utility as plain module | notifyN8n is imported by server actions — not a server action itself; fire-and-forget, never throws | 2026-03-27 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Phase 1 ship | Working quote → order flow | - | Not started |
| SaaS launch | 20 paying customers in 6 months | - | Not started |
| MRR | $10,000+ within 12 months of launch | - | Not started |
| Usability | Admin can create quote without training | - | Not started |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js (App Router) | Full-stack React with API routes |
| Backend | Next.js API Routes | REST endpoints co-located with frontend |
| Database | Supabase (PostgreSQL) | Managed Postgres + auth + RLS + realtime |
| Auth | Supabase Auth | JWT + magic link; admin and staff roles |
| File Storage | AWS S3 (presigned URLs) | Browser uploads directly to S3 |
| Automation | n8n Cloud | Email + SMS; self-hosted for local dev |
| SMS | Twilio (via n8n) | Job completed + ready for pickup alerts |
| Payments | Stripe via PaymentProvider | Payment links; PayPal/Clover pluggable |
| Deployment | Vercel | Auto-deploy from main; preview from PRs |
| UI | Tailwind + shadcn/ui | Desktop-first component system |
| Migrations | Supabase CLI | Tracked in supabase/migrations/ |

## Links

| Resource | URL |
|----------|-----|
| Repository | apps/print-shop-crm/ |
| Planning Doc | projects/print-shop-crm/PLANNING.md |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-03-27 after Phase 2*
