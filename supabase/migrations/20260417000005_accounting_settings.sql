-- Add accounting webhook settings to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS accounting_webhook_url   TEXT,
  ADD COLUMN IF NOT EXISTS accounting_webhook_enabled BOOLEAN NOT NULL DEFAULT false;
