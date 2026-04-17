-- Add accounting sync tracking to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS accounting_sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (accounting_sync_status IN ('pending', 'synced', 'failed')),
  ADD COLUMN IF NOT EXISTS accounting_synced_at TIMESTAMPTZ;
