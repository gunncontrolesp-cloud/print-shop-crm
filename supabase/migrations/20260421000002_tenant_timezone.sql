-- Add timezone to tenants, defaulting to America/Chicago (CST/CDT)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Chicago';
