-- Add auth_user_id to customers (links Supabase auth user to customer record)
ALTER TABLE public.customers
  ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE;

-- Customer RLS: customers can SELECT their own record
CREATE POLICY "Customers can view own record"
  ON public.customers FOR SELECT
  USING (auth_user_id = auth.uid());

-- Customer RLS: customers can SELECT orders linked to their customer record
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
    )
  );

-- Customer RLS: customers can SELECT invoices for their orders
CREATE POLICY "Customers can view own invoices"
  ON public.invoices FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- Customer RLS: customers can SELECT files for their orders
CREATE POLICY "Customers can view own files"
  ON public.files FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- Update handle_new_user trigger: skip public.users insert for portal (customer) signups
-- Portal magic link OTP passes { is_customer: true } in user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF (new.raw_user_meta_data->>'is_customer') = 'true' THEN
    RETURN new;
  END IF;
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'staff');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
