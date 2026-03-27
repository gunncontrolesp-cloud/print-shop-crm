-- Inventory items table
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'supplies',
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'units',
  low_stock_threshold numeric NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin-only RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read inventory"
  ON public.inventory_items FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can insert inventory"
  ON public.inventory_items FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update inventory"
  ON public.inventory_items FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete inventory"
  ON public.inventory_items FOR DELETE
  USING (public.is_admin());

-- updated_at trigger
CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
