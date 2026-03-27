create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'printing', 'finishing', 'completed', 'delivered')),
  line_items jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

-- All authenticated users can view orders
create policy "Authenticated users can view orders"
  on public.orders for select
  using (auth.uid() in (select id from public.users));

-- Staff + admin can create orders
create policy "Staff can create orders"
  on public.orders for insert
  with check (auth.uid() in (select id from public.users));

-- Staff + admin can update orders
create policy "Staff can update orders"
  on public.orders for update
  using (auth.uid() in (select id from public.users))
  with check (auth.uid() in (select id from public.users));

-- Only admin can delete orders
create policy "Admins can delete orders"
  on public.orders for delete
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();
