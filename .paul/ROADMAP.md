# Roadmap: Print Shop CRM

## Overview

Six-phase journey from a single-tenant print shop tool to a nationally-sold SaaS product. Phase 1 replaces the spreadsheet. Phases 2-3 add production automation and payments. Phase 4 opens a customer-facing portal. Phase 5 adds business intelligence. Phase 6 converts to multi-tenant SaaS at $99/$149/$299/mo.

## Current Milestone

**v0.1 Foundation** (v0.1.0)
Status: **Complete** ✓
Phases: 6 of 6 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation — Customers, Quotes, Orders | 5 | **Complete** | 01-01 ✓ 01-02 ✓ 01-03 ✓ 01-04 ✓ 01-05 ✓ |
| 2 | Production + Files + Notifications | 3 | **Complete** | 02-01 ✓ 02-02 ✓ 02-03 ✓ |
| 3 | Invoicing + Payments | TBD | Not started | - |
| 4 | Customer Portal | TBD | Not started | - |
| 5 | Analytics + Inventory | 2 | **Complete** | 05-01 ✓ 05-02 ✓ |
| 6 | SaaS / Multi-Tenant | 3 | **Complete** | 06-01 ✓ 06-02 ✓ 06-03 ✓ |

## Phase Details

### Phase 1: Foundation — Customers, Quotes, Orders

**Goal:** Shop can replace their spreadsheet for customer tracking and quoting
**Depends on:** Nothing (first phase)
**Research:** Likely (Supabase RLS policy patterns for admin/staff roles; pricing table schema design)

**Scope:**
- Customer CRUD (name, business, contact info, preferences JSON)
- Quote Builder with formula-based pricing (base × qty × material × finishing multipliers)
- Admin-editable pricing table (Settings screen)
- Quote → Order conversion (1-click)
- Order status tracking (pending → approved → printing → finishing → completed → delivered)
- Basic dashboard (open orders, status counts)
- Supabase Auth with admin/staff roles + JWT middleware

**Plans:**
- [x] 01-01: Project scaffold + Supabase setup + auth
- [x] 01-02: Customer module (CRUD + list + detail views)
- [x] 01-03: Pricing table + Quote Builder
- [x] 01-04: Order management + status tracking
- [x] 01-05: Dashboard + integration testing

### Phase 2: Production + Files + Notifications

**Goal:** Production team has a live board; customers get notified via email and SMS automatically
**Depends on:** Phase 1 (orders must exist)
**Research:** Likely (n8n Cloud webhook setup; Supabase Realtime subscription patterns)

**Scope:**
- Production board (Trello-style, Supabase Realtime on jobs table)
- Job stage management (design/proofing/printing/finishing/ready_for_pickup)
- File upload system (S3 presigned URLs, content-type allowlist)
- n8n Cloud automations — email: quote ready, order approved, job completed
- SMS via Twilio (via n8n) — job completed, ready for pickup

**Plans:**
- [x] 02-01: Production board + Supabase Realtime
- [x] 02-02: File upload system (S3 presigned URLs)
- [x] 02-03: n8n Cloud automation flows (email + SMS)

### Phase 2.1: Employee Timecards [INSERTED]

**Goal:** Admin can track employee hours and production output per job — replaces paper timesheets
**Depends on:** Phase 2 (production jobs must exist for job-linked time logging)
**Reason:** Requested feature — timecard system tightly coupled to production job tracking introduced in Phase 2
**Research:** Unlikely (internal patterns — clock in/out, notifications via existing n8n infra)

**Scope:**
- Employee self-service clock in/out
- Production logging per clock-in: job linked, task/stage, output quantity
- Admin live dashboard — who is currently clocked in
- Admin timecard editing (missed clock-outs, corrections)
- Admin timecard approval workflow before payroll
- Automated alert when employee forgets to clock out (via n8n)
- Reports — weekly hours by employee, labor cost per job

**Plans:**
- [x] 02.1-01: Data model + clock in/out + employee UI
- [x] 02.1-02: Admin dashboard + editing + approval workflow
- [x] 02.1-03: Notifications (missed clock-out) + reports

---

### Phase 3: Invoicing + Payments

**Goal:** Full order-to-cash flow automated; payment provider is swappable
**Depends on:** Phase 1 (orders), Phase 2 (job completion triggers)
**Research:** Likely (PaymentProvider interface design; Stripe webhook verification)

**Scope:**
- Invoice generation from completed order
- PaymentProvider abstraction layer (interface + Stripe implementation)
- Payment link via email (Stripe hosted payment page)
- Stripe webhook handling (payment confirmed → mark invoice paid)
- Unpaid invoice tracking + dashboard alerts

**Plans:**
- [x] 03-01: Invoice generation + management UI
- [ ] 03-02: PaymentProvider abstraction + Stripe implementation
- [ ] 03-03: Webhook handling + payment status sync

### Phase 4: Customer Portal

**Goal:** Customers self-serve — reduces inbound "where's my order?" calls
**Depends on:** Phase 1-3 (full order lifecycle must exist)
**Research:** Likely (customer-scoped Supabase auth; proof approval flow design)

**Scope:**
- Customer-facing login (Supabase Auth, customer role)
- Order status tracking portal
- Proof approval workflow (approve/reject with comments)
- File download access (completed job files)
- Embedded Stripe checkout (upgrade from payment link)

**Plans:**
- [ ] 04-01: Customer auth + portal scaffold
- [ ] 04-02: Order tracking + file download
- [ ] 04-03: Proof approval workflow
- [ ] 04-04: Embedded Stripe checkout

### Phase 5: Analytics + Inventory

**Goal:** Owner has business intelligence without exporting to spreadsheets
**Depends on:** Phase 3 (revenue data must exist)
**Research:** Unlikely (internal data aggregation; standard charting patterns)

**Scope:**
- Revenue dashboard (top customers, monthly revenue, order volume trends)
- Basic inventory tracking (paper stock, ink)
- Low-stock alerts

**Plans:**
- [ ] 05-01: Revenue analytics dashboard
- [ ] 05-02: Inventory tracking + alerts

### Phase 6: SaaS / Multi-Tenant

**Goal:** Product can be sold to other print shops at $99/$149/$299/mo
**Depends on:** Phases 1-5 (full single-tenant product proven)
**Research:** Likely (Supabase RLS multi-tenant patterns; Stripe subscription billing)

**Scope:**
- Multi-tenant architecture (tenant isolation via Supabase RLS)
- Onboarding flow for new shops
- Subscription billing (Stripe; Starter $99/mo, Pro $149/mo, Premium $299/mo)
- Tier feature gates (Starter: Phase 1 features; Pro: + Phase 2-3; Premium: + Phase 4-5)

**Plans:**
- [x] 06-01: Multi-tenant data isolation + RLS
- [x] 06-02: Onboarding flow
- [x] 06-03: Stripe subscription billing + tier gates

---
*Roadmap created: 2026-03-26*
*Last updated: 2026-03-27 — Phase 5 complete*
