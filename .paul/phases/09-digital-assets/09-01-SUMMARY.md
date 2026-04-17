---
phase: 09-digital-assets
plan: 01
status: complete
completed: 2026-04-17
---

# Summary: Digital Assets — Admin Customer View + Asset Tagging

## What Was Built

- Migration `20260417000003_digital_assets.sql`: adds `is_customer_asset BOOLEAN DEFAULT false` to files; partial index on `(order_id, is_customer_asset) WHERE is_customer_asset = true`
- `toggleCustomerAsset(fileId, isAsset)` in `files.ts`: elevated guard (admin/manager), updates flag, revalidates customer pages
- Customer detail page: "Customer Assets" section showing:
  - **Artwork** (green panel) — files marked `is_customer_asset = true`, with Unmark button
  - **All Files** (white panel) — remaining files from all orders, with "Mark as Asset" button
  - Each row: filename, size, order link, download link
  - Download URLs generated via existing `createPresignedDownloadUrl`
  - Section only shown when customer has at least one file

## Access

Mark/unmark: admin and manager. Download: all authenticated users.
