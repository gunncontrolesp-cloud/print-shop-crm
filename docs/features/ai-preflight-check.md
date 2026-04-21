# Feature: AI File Pre-flight Check

**Status:** Designed — saved for future implementation
**Priority:** High (effort-to-value ratio)
**Phase fit:** After Phase 4 (customer portal must exist for full value)

---

## What It Does

Automatically analyzes uploaded artwork files (PNG/JPG) for common print production issues before the job reaches press. Catches problems early — saving reprints, staff time, and customer frustration.

---

## Decisions Made

- **Trigger:** Auto-runs on file upload + manual re-run available (staff can trigger on demand)
- **Display:** Order detail page (staff) + customer portal + email notification on fail
- **Checks:** Core 4 + extras (see below) — NOT order-aware in v1
- **PDF support:** Not in v1 — shows "unsupported" badge. PNG/JPG only.
- **Email notification:** Only fires when file fails (not warn) AND was uploaded via customer portal

---

## Checks (v1)

| Check | Levels |
|---|---|
| Resolution (DPI) | fail < 150 DPI, warn 150–299 DPI, pass ≥ 300 DPI |
| Color mode | warn if RGB detected (CMYK expected for print) |
| Bleed | warn if no bleed detected at edges |
| Text safe zone | warn if text appears within ~3mm of edge |
| Transparent background | warn if transparency detected where solid expected |
| File readability | fail if image cannot be parsed |

---

## Architecture

**Flow:**
1. Client uploads file to S3 via presigned URL (existing)
2. Frontend calls `POST /api/files/[id]/preflight` after upload completes
3. API sets `preflight_status = 'pending'`, fetches file from S3, base64-encodes it
4. Sends to Claude Vision (`claude-opus-4-6`) with structured system prompt
5. Claude returns JSON with per-check results
6. API stores result in `files` table, updates status
7. If any check = `fail` and upload was from customer portal → fires n8n `preflight_failed` event → customer email

**Manual re-run:** Staff clicks "Re-run Pre-flight" button on file → same API route, overwrites result

---

## Database Changes

```sql
ALTER TABLE files 
  ADD COLUMN preflight_status text DEFAULT 'pending' 
    CHECK (preflight_status IN ('pending','pass','warn','fail','unsupported','error')),
  ADD COLUMN preflight_result jsonb,
  ADD COLUMN preflight_ran_at timestamptz;
```

---

## API

- `POST /api/files/[id]/preflight` — runs analysis, returns updated file record
- n8n event: `preflight_failed` — payload: `{ order_id, customer_id, file_name, issues: string[] }`

---

## preflight_result Shape

```json
{
  "resolution": { "status": "fail", "message": "Image is 72 DPI — print requires 300 DPI minimum" },
  "color_mode": { "status": "warn", "message": "RGB detected — may shift when converted to CMYK" },
  "bleed": { "status": "pass", "message": null },
  "text_safe_zone": { "status": "warn", "message": "Text appears within 3mm of edge — risk of clipping" },
  "transparency": { "status": "pass", "message": null },
  "readability": { "status": "pass", "message": null }
}
```

---

## UI

- File list shows a badge per file: green (pass), yellow (warn), red (fail), gray (unsupported/pending)
- Clicking the badge expands a panel showing per-check results with plain-English messages
- "Re-run Pre-flight" button visible to staff
- Customer portal shows the same badge + messages (read-only)

---

## Future: v2 Enhancements

- PDF support: render first page to PNG server-side, then pass to Vision
- Order-aware checks: pass product type + dimensions from quote line items to Claude for dimension validation
- Auto-block job from moving to "Printing" stage if file has active `fail` status (with override)

---

## Dependencies

- `ANTHROPIC_API_KEY` env var
- Claude Vision API (`claude-opus-4-6`)
- Existing S3 file storage
- Existing n8n webhook infrastructure
- Customer portal (Phase 4) for full email notification value
