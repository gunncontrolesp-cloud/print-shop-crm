-- Add deposit/payment-mode settings to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'full'
    CHECK (payment_mode IN ('full', 'deposit')),
  ADD COLUMN IF NOT EXISTS deposit_percent numeric(5,2) NOT NULL DEFAULT 50
    CHECK (deposit_percent > 0 AND deposit_percent <= 100);
