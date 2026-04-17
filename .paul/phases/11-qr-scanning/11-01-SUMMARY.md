---
phase: 11-qr-scanning
plan: 01
status: complete
completed: 2026-04-17
---

# Summary: QR Scanning (Shop Floor)

## What Was Built

- `npm install qrcode @types/qrcode` — added QR generation dependency
- `src/lib/qr.ts` — `generateQrDataUrl(text)` wraps `qrcode` library, returns data URL at 200px
- `src/app/dashboard/jobs/[id]/page.tsx` — admin/manager-only job detail page with QR code display
  - `src/app/dashboard/jobs/[id]/PrintButton.tsx` — client component for `window.print()`
- `src/app/scan/[jobId]/page.tsx` — server component: auth guard (redirect to `/login?next=/scan/[jobId]`), fetches job, computes nextStage, renders ScanClient
- `src/app/scan/[jobId]/ScanClient.tsx` — mobile-optimized client component with dark theme; Advance Stage button uses `updateJobStage`; local state updates without page reload; "✓ Job is complete" when all stages done
- `src/components/production-board.tsx` — "View / Print QR" link added to every job card linking to `/dashboard/jobs/[id]`
- `src/app/login/page.tsx` — post-login redirect now honors `?next=` query param (used by scan page auth gate)

## Env var needed

Add to `.env.local`: `NEXT_PUBLIC_APP_URL=https://your-domain.com` (used to build scan URL in QR code)

## Notes

- `updateJobStage` enforces sequential stage transitions and payment gate before `printing` — these still apply on the scan page
- QR page is print-friendly; `PrintButton` uses `window.print()` so browser print dialog handles layout
