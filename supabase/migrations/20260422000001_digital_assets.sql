ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS is_customer_asset BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_files_customer_asset
  ON public.files (order_id, is_customer_asset)
  WHERE is_customer_asset = true;
