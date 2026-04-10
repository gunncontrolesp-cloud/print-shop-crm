-- ─────────────────────────────────────────────────────────────────────────────
-- Security Hardening Migration
-- Fixes identified in RLS security audit (2026-04-10)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. SET search_path ON ALL SECURITY DEFINER FUNCTIONS ─────────────────────
-- Without this, an attacker who can create objects in any schema can shadow
-- functions called by SECURITY DEFINER context, escalating privileges.
-- See: https://supabase.com/docs/guides/database/database-linter#function-search-path-mutable

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
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
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND tenant_id IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Skip portal customers — they are not staff
  IF (NEW.raw_user_meta_data->>'is_customer' = 'true') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'staff'),
    (NEW.raw_user_meta_data->>'tenant_id')::uuid
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 2. REVOKE helper functions from anon; grant only to authenticated ─────────
-- Prevents unauthenticated callers from probing tenant/role data via RPC.

REVOKE EXECUTE ON FUNCTION public.get_my_tenant_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_authenticated() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;

-- ── 3. FIX proof approval customer policy ────────────────────────────────────
-- BUG: WITH CHECK (stage IN ('proofing', 'printing') ...) allowed a portal
-- customer to set stage = 'printing', bypassing the invoice payment gate.
-- Fix: customers may ONLY update proof_decision and proof_comments, never stage.

DROP POLICY IF EXISTS "Customers can submit proof decision" ON public.jobs;
DROP POLICY IF EXISTS "Customers can update proof decision" ON public.jobs;

CREATE POLICY "Customers can update proof decision"
  ON public.jobs FOR UPDATE
  USING (
    stage = 'proofing'
    AND proof_decision IS NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE o.id = jobs.order_id
      AND c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Customers may only set proof_decision — stage is NOT in the check list
    proof_decision IN ('approved', 'changes_requested')
  );

-- ── 4. FIX duplicate customer view-jobs policy ───────────────────────────────
-- "Customers can view own jobs" was created in 3 separate migrations without
-- DROP IF EXISTS, resulting in duplicate permissive policies. Consolidate.

DROP POLICY IF EXISTS "Customers can view own jobs" ON public.jobs;

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

-- ── 5. FIX time_entries: staff cannot self-approve ───────────────────────────
-- The existing staff UPDATE policy allows updating any column including
-- status/approved_by/approved_at. Restrict staff updates to non-approval cols.

DROP POLICY IF EXISTS "Staff can update own open time entries" ON public.time_entries;

CREATE POLICY "Staff can update own open time entries"
  ON public.time_entries FOR UPDATE
  USING (
    user_id = auth.uid()
    AND tenant_id = public.get_my_tenant_id()
    AND clocked_out_at IS NULL
    AND status = 'pending'  -- cannot modify already-approved entries
  )
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.get_my_tenant_id()
    AND status = 'pending'  -- staff cannot set their own status to 'approved'
  );

-- ── 6. ADD products table RLS ─────────────────────────────────────────────────
-- The products table is used throughout the app but was never created via
-- migration and has no RLS. Create the table if it doesn't exist, then secure it.

CREATE TABLE IF NOT EXISTS public.products (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  category    text,
  description text,
  unit_price  numeric(10,2) NOT NULL DEFAULT 0,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (idempotent)
DROP POLICY IF EXISTS "Staff can view own tenant products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert own tenant products" ON public.products;
DROP POLICY IF EXISTS "Admins can update own tenant products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete own tenant products" ON public.products;

CREATE POLICY "Staff can view own tenant products"
  ON public.products FOR SELECT
  USING (tenant_id = public.get_my_tenant_id() AND public.is_authenticated());

CREATE POLICY "Admins can insert own tenant products"
  ON public.products FOR INSERT
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can update own tenant products"
  ON public.products FOR UPDATE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin())
  WITH CHECK (tenant_id = public.get_my_tenant_id() AND public.is_admin());

CREATE POLICY "Admins can delete own tenant products"
  ON public.products FOR DELETE
  USING (tenant_id = public.get_my_tenant_id() AND public.is_admin());

-- ── 7. ADD users UPDATE policy ───────────────────────────────────────────────
-- Users have no UPDATE policy — they can't update their own profile via client.
-- Currently worked around by service client in server actions. Adding the
-- proper policy so future client-side profile updates work correctly.

DROP POLICY IF EXISTS "Users can update own record" ON public.users;

CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
