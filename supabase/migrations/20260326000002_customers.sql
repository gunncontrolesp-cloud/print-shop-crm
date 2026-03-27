create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  business_name text,
  email text,
  phone text,
  address text,
  preferences jsonb not null default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.customers enable row level security;

-- Admin: full CRUD
create policy "Admins can manage customers"
  on public.customers
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Staff: SELECT, INSERT, UPDATE (no DELETE)
create policy "Staff can view customers"
  on public.customers for select
  using (auth.uid() in (select id from public.users));

create policy "Staff can create customers"
  on public.customers for insert
  with check (auth.uid() in (select id from public.users));

create policy "Staff can update customers"
  on public.customers for update
  using (auth.uid() in (select id from public.users))
  with check (auth.uid() in (select id from public.users));

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger customers_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();
