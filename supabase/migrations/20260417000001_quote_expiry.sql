-- Add expires_at to quotes table
-- Default 30 days from creation; NULL = no expiry set (pre-migration quotes)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill: give existing active quotes a 30-day window from creation
UPDATE public.quotes
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL AND status IN ('pending', 'sent');
