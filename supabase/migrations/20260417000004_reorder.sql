-- Track reorder quotes so admins can identify and prioritize them
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS is_reorder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
