-- Fix RLS infinite recursion across all tables.
--
-- Root cause: policies on customers/quotes/orders/pricing_config subquery
-- public.users to check role. Evaluating those subqueries triggers the RLS
-- policies on public.users, one of which also subqueries public.users →
-- infinite recursion.
--
-- Fix: SECURITY DEFINER functions bypass RLS when checking the users table,
-- breaking the recursion. All policies now call these functions instead of
-- inlining the subquery.

-- ── Helper functions ──────────────────────────────────────────────────────────

create or replace function public.is_authenticated()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid()
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  )
$$;

-- ── public.users ──────────────────────────────────────────────────────────────

drop policy if exists "Admins can view all users" on public.users;
drop policy if exists "Users can view own record" on public.users;

create policy "Users can view own record"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can view all users"
  on public.users for select
  using (public.is_admin());

-- ── public.customers ─────────────────────────────────────────────────────────

drop policy if exists "Admins can manage customers" on public.customers;
drop policy if exists "Staff can view customers" on public.customers;
drop policy if exists "Staff can create customers" on public.customers;
drop policy if exists "Staff can update customers" on public.customers;

create policy "Admins can manage customers"
  on public.customers
  using (public.is_admin())
  with check (public.is_admin());

create policy "Staff can view customers"
  on public.customers for select
  using (public.is_authenticated());

create policy "Staff can create customers"
  on public.customers for insert
  with check (public.is_authenticated());

create policy "Staff can update customers"
  on public.customers for update
  using (public.is_authenticated())
  with check (public.is_authenticated());

-- ── public.pricing_config ────────────────────────────────────────────────────

drop policy if exists "Authenticated users can read pricing config" on public.pricing_config;
drop policy if exists "Admins can update pricing config" on public.pricing_config;
drop policy if exists "Admins can insert pricing config" on public.pricing_config;

create policy "Authenticated users can read pricing config"
  on public.pricing_config for select
  using (public.is_authenticated());

create policy "Admins can update pricing config"
  on public.pricing_config for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can insert pricing config"
  on public.pricing_config for insert
  with check (public.is_admin());

-- ── public.quotes ────────────────────────────────────────────────────────────

drop policy if exists "Authenticated users can view quotes" on public.quotes;
drop policy if exists "Staff can create quotes" on public.quotes;
drop policy if exists "Staff can update quotes" on public.quotes;
drop policy if exists "Admins can delete quotes" on public.quotes;

create policy "Authenticated users can view quotes"
  on public.quotes for select
  using (public.is_authenticated());

create policy "Staff can create quotes"
  on public.quotes for insert
  with check (public.is_authenticated());

create policy "Staff can update quotes"
  on public.quotes for update
  using (public.is_authenticated())
  with check (public.is_authenticated());

create policy "Admins can delete quotes"
  on public.quotes for delete
  using (public.is_admin());

-- ── public.orders ────────────────────────────────────────────────────────────

drop policy if exists "Authenticated users can view orders" on public.orders;
drop policy if exists "Staff can create orders" on public.orders;
drop policy if exists "Staff can update orders" on public.orders;
drop policy if exists "Admins can delete orders" on public.orders;

create policy "Authenticated users can view orders"
  on public.orders for select
  using (public.is_authenticated());

create policy "Staff can create orders"
  on public.orders for insert
  with check (public.is_authenticated());

create policy "Staff can update orders"
  on public.orders for update
  using (public.is_authenticated())
  with check (public.is_authenticated());

create policy "Admins can delete orders"
  on public.orders for delete
  using (public.is_admin());
