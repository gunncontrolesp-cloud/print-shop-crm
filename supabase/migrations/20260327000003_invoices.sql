create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null unique,
  amount numeric(10,2) not null,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid')),
  due_date date,
  stripe_payment_intent_id text,
  stripe_payment_link_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.invoices enable row level security;

create policy "Authenticated users can view invoices"
  on public.invoices for select using (public.is_authenticated());

create policy "Admins can create invoices"
  on public.invoices for insert with check (public.is_admin());

create policy "Admins can update invoices"
  on public.invoices for update using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete invoices"
  on public.invoices for delete using (public.is_admin());

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();
