---
phase: 02-production
plan: 02
subsystem: storage
tags: [s3, aws, file-upload, presigned-url, supabase-rls]

requires:
  - phase: 01-foundation
    provides: orders table and order detail page this attaches files to
provides:
  - public.files table with RLS
  - S3 presigned upload/delete flow (server actions)
  - FileUploader + OrderFilesPanel client components
  - Files section on order detail page
affects: [02-03-notifications, 04-customer-portal]

tech-stack:
  added: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"]
  patterns: ["presigned URL upload (client PUT directly to S3)", "server action validates → client uploads → server records", "OrderFilesPanel client boundary wrapping server component page"]

key-files:
  created:
    - supabase/migrations/20260327000002_files.sql
    - src/lib/actions/files.ts
    - src/components/file-uploader.tsx
  modified:
    - src/app/dashboard/orders/[id]/page.tsx
    - .env.local.example

key-decisions:
  - "OrderFilesPanel is the exported client boundary; FileUploader is internal — useRouter stays contained"
  - "crypto.randomUUID() dynamically imported for Next.js 16 edge runtime compatibility"

patterns-established:
  - "Presigned URL pattern: server generates URL + s3Key, client PUTs directly, server records metadata"
  - "Client-side MIME type check mirrors server-side allowlist — reject before any network call"

duration: ~30min
started: 2026-03-27T00:00:00Z
completed: 2026-03-27T00:00:00Z
---

# Phase 2 Plan 02: File Upload System (S3 Presigned URLs) Summary

**S3 presigned URL file upload system: staff can attach design files to orders with server-enforced content-type allowlist, direct client-to-S3 upload, and admin-only delete — all persisted in `public.files` and visible on the order detail page.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Tasks | 2 completed |
| Files modified | 5 |
| Deviations | 0 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Upload flow end-to-end | Pass | presign → client PUT → recordUploadedFile → list updates |
| AC-2: Content-type allowlist | Pass | Enforced server-side in `createPresignedUploadUrl` before S3 call; also client-side |
| AC-3: Files persist on reload | Pass | Server component re-fetches from DB on render; `router.refresh()` triggers re-fetch |
| AC-4: File delete (admin only) | Pass | Removes from S3 + DB; delete button only rendered when `isAdmin` |

## Accomplishments

- `public.files` table with RLS: authenticated SELECT/INSERT, admin-only DELETE
- Three server actions (`createPresignedUploadUrl`, `recordUploadedFile`, `deleteFile`) — all auth-gated, content-type allowlist + 100 MB limit enforced server-side
- `OrderFilesPanel` / `FileUploader` client components with upload state, progress feedback, and inline delete
- Order detail page now shows a Files section with upload control + file list (name, size, date)
- AWS SDK installed; `.env.local.example` updated with placeholder vars

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260327000002_files.sql` | Created | files table + RLS policies |
| `src/lib/actions/files.ts` | Created | createPresignedUploadUrl, recordUploadedFile, deleteFile |
| `src/components/file-uploader.tsx` | Created | OrderFilesPanel (exported) + FileUploader (internal) |
| `src/app/dashboard/orders/[id]/page.tsx` | Modified | Files query + Files section added |
| `.env.local.example` | Modified | AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME placeholders |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `OrderFilesPanel` as client boundary, `FileUploader` internal | Server component page can't use `useRouter` directly; boundary component keeps routing logic in client layer | Order detail stays a server component; clean separation |
| `crypto.randomUUID()` dynamic import | Next.js 16 edge runtime may not have `crypto` in static scope | Safe S3 key generation without runtime errors |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `public.files` table ready for 02-03 (n8n can reference file events)
- File upload pattern established for reuse in Phase 4 (customer portal file downloads)
- AWS SDK in place; presigned URL pattern reusable

**Concerns:**
- Migration 20260327000002_files.sql (and 000001–000004) not yet applied to Supabase — required before runtime testing

**Blockers:**
- AWS credentials needed in `.env.local` before file uploads work at runtime

---
*Phase: 02-production, Plan: 02*
*Completed: 2026-03-27*
