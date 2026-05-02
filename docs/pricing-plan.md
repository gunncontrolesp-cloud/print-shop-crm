# Pricing Plan — Implementation Spec

## Overview

Three tiers. Storage is baked into each plan (upgrade to get more). Users have
a per-plan cap with a $12/user/mo overage on Starter and Pro. Premium is
unlimited on both.

---

## Plans

| Plan    | Price    | Users included | User overage    | Storage included | Storage overage |
|---------|----------|----------------|-----------------|------------------|-----------------|
| Starter | $99/mo   | Up to 4        | +$12/user/mo    | 10 GB            | Upgrade to Pro  |
| Pro     | $149/mo  | Up to 8        | +$12/user/mo    | 75 GB            | Upgrade to Premium |
| Premium | $299/mo  | Unlimited      | None            | Unlimited        | None            |

---

## User Enforcement

- **Starter / Pro**: Enforce hard cap after overage billing option is declined,
  or if the shop has no payment method on file for overages.
- Show an in-app upgrade prompt at **80% of the seat limit** (≥ 4 of 4 used on
  Starter, ≥ 7 of 8 on Pro).
- Overage seats are billed through Stripe as a metered line item on the next
  monthly invoice. Each extra seat is counted at the billing snapshot date.
- **Premium**: No seat limit. No prompt. No overage.

### Stripe implementation notes
- Starter and Pro plans should have a Stripe metered add-on price for user
  overages (price ID to be created).
- When a new user is invited and the seat count exceeds the plan limit, trigger
  a Stripe usage record update.
- If the customer has no payment method capable of covering the overage, block
  the invite and show a paywall modal.

---

## Storage Enforcement

- Track cumulative S3 storage per tenant (sum of all uploaded file sizes).
- Enforce at **upload time**: if the upload would push the tenant over their
  plan limit, reject it and show an upgrade prompt.
- Show a soft warning banner in the app when storage reaches **80% of limit**
  (8 GB for Starter, 60 GB for Pro).
- No per-GB overage billing — storage is a hard upgrade gate, not a metered
  charge. This keeps billing simple and makes Premium's "unlimited" claim clean.

### S3 implementation notes
- Store cumulative storage used in the `tenants` table (update on every upload
  and delete).
- Add a `storage_used_bytes` column to `tenants` with an RLS-safe read for the
  settings page storage meter.
- Presigned upload URLs should check remaining quota before generation and
  return a 402 if the tenant is at or over limit.

---

## Plan Limits Reference (for enforcement middleware / RLS)

```ts
export const PLAN_LIMITS = {
  starter: {
    users: 4,
    storageBytes: 10 * 1024 ** 3,      // 10 GB
    userOverageRate: 12_00,             // $12.00 in cents
  },
  pro: {
    users: 8,
    storageBytes: 75 * 1024 ** 3,      // 75 GB
    userOverageRate: 12_00,
  },
  premium: {
    users: Infinity,
    storageBytes: Infinity,
    userOverageRate: 0,
  },
} as const;
```

---

## Marketing Copy Anchors

These are the claims used on the marketing site — keep in sync if limits change.

| Plan    | Users claim           | Storage claim  | CTA              |
|---------|-----------------------|----------------|------------------|
| Starter | Up to 4 users         | 10 GB storage  | Start Free Trial |
| Pro     | Up to 8 users         | 75 GB storage  | Book a Demo      |
| Premium | Unlimited users       | Unlimited storage | Book a Demo   |

Per-seat overage rate shown on pricing page: **+$12/user/mo** (Starter & Pro).  
Storage overage: none — hard gate, upgrade prompt only.

---

## Upgrade Path

```
Starter (4 users / 10 GB)
  → hit user cap or storage cap → prompt upgrade to Pro

Pro (8 users / 75 GB)
  → hit user cap or storage cap → prompt upgrade to Premium

Premium (unlimited / unlimited)
  → no caps
```

---

## Open Questions (resolve before implementation)

- [ ] Should user overage be opt-in (admin explicitly accepts extra seat charge)
      or automatic (Stripe charges on next cycle)?
- [ ] Grace period on storage overage? (e.g. 7-day read-only mode before
      blocking new uploads)
- [ ] Annual billing discount? (not currently offered — revisit at launch)
- [ ] Free trial scope: Starter only, 14 days, full feature access, no card
      required. Trial ends → subscription required or data locked (not deleted).
