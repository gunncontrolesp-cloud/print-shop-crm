-- ── 1. Tenants table ──────────────────────────────────────────────────────────

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan_tier text NOT NULL DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'pro', 'premium')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Seed tenant for existing data ─────────────────────────────────────────

INSERT INTO public.tenants (id, name, plan_tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'premium');

-- ── 3. Add tenant_id to all tables (nullable first for backfill) ──────────────

ALTER TABLE public.users
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.customers
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.pricing_config
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.quotes
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.jobs
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.files
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.invoices
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_items
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ── 4. Backfill all existing rows with seed tenant ────────────────────────────

UPDATE public.users SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.pricing_config SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.quotes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.orders SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.jobs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.files SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.invoices SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE public.inventory_items SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- ── 5. Make tenant_id NOT NULL on data tables ─────────────────────────────────
-- public.users.tenant_id stays nullable (users mid-onboarding have no tenant yet)

ALTER TABLE public.customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.pricing_config ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.files ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN tenant_id SET NOT NULL;

-- ── 6. get_my_tenant_id() helper function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$;

-- ── 7. Rebuild is_admin() and is_authenticated() ──────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND tenant_id IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND tenant_id IS NOT NULL
  )
$$;

-- ── 8. Tenants table RLS (now get_my_tenant_id() exists) ──────────────────────

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_my_tenant_id());

CREATE POLICY "Admin can update own tenant"
  ON public.tenants FOR UPDATE
  USING (id = public.get_my_tenant_id() AND public.is_admin())
  WITH CHECK (id = public.get_my_tenant_id() AND public.is_admin());

-- ── 9. Rebuild ALL data table RLS policies with tenant_id filter ──────────────

-- public.users
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view tenant users"
  ON public.users FOR SELECT
  USING (public.is_admin() AND tenant_id = public.get_my_tenant_id());

-- public.customers
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can create customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;

CREATE POLICY "Staff can view own tenant customers"
  ON public.customers FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can create own tenant customers"
  ON public.customers FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can update own tenant customers"
  ON public.customers FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can delete own tenant customers"
  ON public.customers FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- public.pricing_config
DROP POLICY IF EXISTS "Authenticated users can read pricing config" ON public.pricing_config;
DROP POLICY IF EXISTS "Admins can update pricing config" ON public.pricing_config;
DROP POLICY IF EXISTS "Admins can insert pricing config" ON public.pricing_config;

CREATE POLICY "Authenticated can read own tenant pricing config"
  ON public.pricing_config FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can update own tenant pricing config"
  ON public.pricing_config FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can insert own tenant pricing config"
  ON public.pricing_config FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- public.quotes
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Staff can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Staff can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON public.quotes;

CREATE POLICY "Staff can view own tenant quotes"
  ON public.quotes FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can create own tenant quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can update own tenant quotes"
  ON public.quotes FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can delete own tenant quotes"
  ON public.quotes FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- public.orders
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

CREATE POLICY "Staff can view own tenant orders"
  ON public.orders FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can create own tenant orders"
  ON public.orders FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can update own tenant orders"
  ON public.orders FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can delete own tenant orders"
  ON public.orders FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- Customer order access (portal: order status tracking)
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = orders.customer_id
      AND c.auth_user_id = auth.uid()
    )
  );

-- public.jobs
DROP POLICY IF EXISTS "Admins and staff can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Customers can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Customers can update proof decision" ON public.jobs;

CREATE POLICY "Staff can view own tenant jobs"
  ON public.jobs FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can create own tenant jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins and staff can update own tenant jobs"
  ON public.jobs FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can delete own tenant jobs"
  ON public.jobs FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- Customer proof approval: scoped by order ownership (not tenant)
-- Customers are in auth.users but NOT in public.users, so is_authenticated() = false for them.
CREATE POLICY "Customers can view own jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = jobs.order_id
      AND c.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can update proof decision"
  ON public.jobs FOR UPDATE
  USING (
    stage = 'proofing' AND proof_decision IS NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = jobs.order_id
      AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    stage IN ('proofing', 'printing')
    AND proof_decision IN ('approved', 'changes_requested')
  );

-- public.files
DROP POLICY IF EXISTS "Authenticated users can view files" ON public.files;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON public.files;
DROP POLICY IF EXISTS "Admins can delete files" ON public.files;
DROP POLICY IF EXISTS "Customers can view own files" ON public.files;

CREATE POLICY "Staff can view own tenant files"
  ON public.files FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Staff can upload own tenant files"
  ON public.files FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can delete own tenant files"
  ON public.files FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- Customer file access (portal download — scoped by order ownership)
CREATE POLICY "Customers can view own order files"
  ON public.files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = files.order_id
      AND c.auth_user_id = auth.uid()
    )
  );

-- public.invoices
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customers can view own invoices via order" ON public.invoices;

CREATE POLICY "Staff can view own tenant invoices"
  ON public.invoices FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can insert own tenant invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can update own tenant invoices"
  ON public.invoices FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can delete own tenant invoices"
  ON public.invoices FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- Customer invoice access (portal payment)
CREATE POLICY "Customers can view own invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = invoices.order_id
      AND c.auth_user_id = auth.uid()
    )
  );

-- public.inventory_items
DROP POLICY IF EXISTS "Admin can read inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Admin can insert inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Admin can update inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Admin can delete inventory" ON public.inventory_items;

CREATE POLICY "Admin can read own tenant inventory"
  ON public.inventory_items FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admin can insert own tenant inventory"
  ON public.inventory_items FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admin can update own tenant inventory"
  ON public.inventory_items FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admin can delete own tenant inventory"
  ON public.inventory_items FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- ── 10. Update handle_new_user trigger ────────────────────────────────────────
-- Now reads tenant_id + role from user metadata.
-- Portal customers (is_customer = true) still skipped.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip portal customers — they are not staff
  IF (NEW.raw_user_meta_data->>'is_customer' = 'true') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff'),
    (NEW.raw_user_meta_data->>'tenant_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
