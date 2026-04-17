-- Track when a reminder email was last sent for a quote
-- Used to enforce 48h cooldown between reminders
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
