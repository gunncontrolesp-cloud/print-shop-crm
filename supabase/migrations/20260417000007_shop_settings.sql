-- Add shop contact and settings columns to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS shop_name     text,
  ADD COLUMN IF NOT EXISTS shop_address  text,
  ADD COLUMN IF NOT EXISTS shop_phone    text,
  ADD COLUMN IF NOT EXISTS shop_email    text,
  ADD COLUMN IF NOT EXISTS logo_url      text,
  ADD COLUMN IF NOT EXISTS tax_rate      numeric(5,2) NOT NULL DEFAULT 0
    CHECK (tax_rate >= 0 AND tax_rate <= 100),
  ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT 'Due on receipt';
