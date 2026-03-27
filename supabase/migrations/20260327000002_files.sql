create table public.files (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade not null,
  name text not null,
  s3_key text not null,
  content_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.files enable row level security;

create policy "Authenticated users can view files"
  on public.files for select using (public.is_authenticated());

create policy "Authenticated users can upload files"
  on public.files for insert with check (public.is_authenticated());

create policy "Admins can delete files"
  on public.files for delete using (public.is_admin());
