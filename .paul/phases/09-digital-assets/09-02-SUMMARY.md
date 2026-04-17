---
phase: 09-digital-assets
plan: 02
status: complete
completed: 2026-04-17
---

# Summary: Portal Assets Tab — Customer-Facing Artwork Downloads

## What Was Built

- `src/app/portal/(protected)/assets/page.tsx` (new): portal page showing only `is_customer_asset = true` files for the logged-in customer; download links via presigned URLs; empty state message
- Portal layout: "Assets" link added to header nav alongside Orders and Invoices

## Auth pattern

Follows existing portal pattern: `createClient()` for RLS-filtered queries, `createServiceClient()` for customer lookup by `auth_user_id`.
